import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    console.log('Webhook received event:', payload.event);

    const { event, data } = payload;

    // ============================================================
    // HANDLE: messages.upsert (inbound + outbound from phone)
    // ============================================================
    if (event === 'messages.upsert' && data?.messages) {
      const message = data.messages;
      console.log('Processing message key:', JSON.stringify(message.key));

      // Determine direction (needed before phone extraction)
      const isFromMe = message.key?.fromMe === true;
      const direction = isFromMe ? 'outbound' : 'inbound';

      // Extract contact phone number
      // For LID-based remoteJids (@lid), use cleanedSenderPn/senderPn instead
      let phoneNumber = '';
      const remoteJid = message.key?.remoteJid || message.remoteJid || '';

      if (isFromMe) {
        // Outbound: remoteJid is the recipient
        if (remoteJid.endsWith('@s.whatsapp.net')) {
          phoneNumber = remoteJid.split('@')[0];
        }
      } else {
        // Inbound: prefer cleanedSenderPn/senderPn (reliable), fallback to remoteJid only if @s.whatsapp.net
        if (message.key?.cleanedSenderPn) {
          phoneNumber = message.key.cleanedSenderPn;
        } else if (message.key?.senderPn) {
          phoneNumber = message.key.senderPn.split('@')[0];
        } else if (remoteJid.endsWith('@s.whatsapp.net')) {
          phoneNumber = remoteJid.split('@')[0];
        }
      }

      // Skip messages where no valid phone number could be extracted (groups, broadcast, LIDs without senderPn)
      if (!phoneNumber) {
        console.log('Skipping message: no phone number extractable. remoteJid:', remoteJid);
        return new Response(JSON.stringify({ success: true, skipped: 'no-phone' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate E.164 format (7-15 digits)
      const digits = phoneNumber.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) {
        console.error('Invalid phone number:', phoneNumber, 'from remoteJid:', remoteJid);
        return new Response(JSON.stringify({ success: true, skipped: 'invalid-phone' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const cleanPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      console.log('Contact phone:', cleanPhone, 'Direction:', direction);

      // Extract message content
      const messageContent =
        message.message?.extendedTextMessage?.text ||
        message.message?.conversation ||
        message.message?.imageMessage?.caption ||
        message.message?.videoMessage?.caption ||
        message.message?.documentMessage?.caption ||
        message.message?.audioMessage?.caption ||
        '';

      // Determine message type and media
      let messageType = 'text';
      let mediaInfo = null;

      if (message.message?.imageMessage) {
        messageType = 'image';
        mediaInfo = message.message.imageMessage;
      } else if (message.message?.videoMessage) {
        messageType = 'video';
        mediaInfo = message.message.videoMessage;
      } else if (message.message?.documentMessage) {
        messageType = 'document';
        mediaInfo = message.message.documentMessage;
      } else if (message.message?.audioMessage) {
        messageType = 'audio';
        mediaInfo = message.message.audioMessage;
      } else if (message.message?.stickerMessage) {
        messageType = 'sticker';
        mediaInfo = message.message.stickerMessage;
      }

      // Find whatsapp_number by api_key (Wasender sends sessionId as api_key)
      const { data: whatsappNumber, error: whatsappError } = await supabaseClient
        .from('whatsapp_numbers')
        .select('id, phone_number, session_id, api_key, organization_id, branch_id')
        .eq('api_key', payload.sessionId?.toString())
        .maybeSingle();

      if (whatsappError || !whatsappNumber) {
        console.log('WhatsApp number not found for session:', payload.sessionId);
        return new Response(JSON.stringify({ success: false, error: 'WhatsApp number not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Helper for media
      const getFileExtension = (msgType: string): string => {
        const map: Record<string, string> = {
          audio: 'ogg', video: 'mp4', image: 'jpg', document: 'pdf', sticker: 'webp',
        };
        return map[msgType] || 'bin';
      };

      const getContentType = (msgType: string): string => {
        const map: Record<string, string> = {
          audio: 'audio/ogg', video: 'video/mp4', image: 'image/jpeg',
          document: 'application/pdf', sticker: 'image/webp',
        };
        return map[msgType] || 'application/octet-stream';
      };

      let mediaUrl: string | null = null;

      // Decrypt and store media
      if (mediaInfo && whatsappNumber.api_key) {
        try {
          const decryptResponse = await fetch('https://www.wasenderapi.com/api/decrypt-media', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${whatsappNumber.api_key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              data: { messages: { key: message.key, message: message.message } },
            }),
          });

          if (decryptResponse.ok) {
            const decryptResult = await decryptResponse.json();
            const tempMediaUrl =
              decryptResult.data?.publicUrl ||
              decryptResult.publicUrl ||
              decryptResult.data?.url ||
              null;

            if (tempMediaUrl) {
              console.log(`Decrypted media URL obtained for ${messageType}, uploading to storage...`);
              let attempts = 0;
              while (!mediaUrl && attempts < 3) {
                attempts++;
                try {
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 30000);
                  const mediaResponse = await fetch(tempMediaUrl, { signal: controller.signal });
                  clearTimeout(timeoutId);

                  if (!mediaResponse.ok) throw new Error(`HTTP ${mediaResponse.status}`);

                  const mediaBlob = await mediaResponse.blob();
                  const fileName = `${message.key.id}_${Date.now()}.${getFileExtension(messageType)}`;
                  const filePath = `${messageType}s/${fileName}`;

                  const { error: uploadError } = await supabaseClient.storage
                    .from('whatsapp-media')
                    .upload(filePath, mediaBlob, {
                      contentType: getContentType(messageType),
                      upsert: false,
                    });

                  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

                  const { data: publicUrlData } = supabaseClient.storage
                    .from('whatsapp-media')
                    .getPublicUrl(filePath);

                  mediaUrl = publicUrlData.publicUrl;
                } catch (err) {
                  console.error(`Media upload attempt ${attempts}/3 failed for ${messageType}:`, err instanceof Error ? err.message : err);
                  if (attempts < 3) await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                }
              }

              // Fallback: use temporary Wasender URL if all upload attempts failed
              if (!mediaUrl) {
                console.error(`All upload attempts failed for ${messageType}. Using temporary Wasender URL as fallback.`);
                mediaUrl = tempMediaUrl;
              }
            }
          }
        } catch (decryptError) {
          console.error('Error decrypting media:', decryptError);
        }
      }

      // Check if a contact already exists for this phone (to link if so)
      const { data: existingContact } = await supabaseClient
        .from('contacts')
        .select('id')
        .eq('phone', cleanPhone)
        .eq('organization_id', whatsappNumber.organization_id)
        .maybeSingle();

      // Find or create conversation by phone_number (not contact_id)
      let conversation = null;
      const { data: existingConversation } = await supabaseClient
        .from('wa_conversations')
        .select('id')
        .eq('phone_number', cleanPhone)
        .eq('whatsapp_number_id', whatsappNumber.id)
        .maybeSingle();

      if (existingConversation) {
        conversation = existingConversation;
        // If contact exists but wasn't linked yet, link it now
        if (existingContact) {
          await supabaseClient
            .from('wa_conversations')
            .update({ contact_id: existingContact.id })
            .eq('id', existingConversation.id)
            .is('contact_id', null);
        }
        // Update push_name if changed
        if (message.pushName) {
          await supabaseClient
            .from('wa_conversations')
            .update({ push_name: message.pushName })
            .eq('id', existingConversation.id);
        }
      } else {
        const { data: newConversation, error: conversationError } = await supabaseClient
          .from('wa_conversations')
          .insert({
            phone_number: cleanPhone,
            push_name: message.pushName || null,
            contact_id: existingContact?.id || null,
            whatsapp_number_id: whatsappNumber.id,
            organization_id: whatsappNumber.organization_id,
            branch_id: whatsappNumber.branch_id,
            status: 'open',
            priority: 'medium',
          })
          .select()
          .single();

        if (conversationError) {
          // Handle race condition on unique(phone_number, whatsapp_number_id)
          if (conversationError.code === '23505') {
            const { data: existingConv } = await supabaseClient
              .from('wa_conversations')
              .select('id')
              .eq('phone_number', cleanPhone)
              .eq('whatsapp_number_id', whatsappNumber.id)
              .single();
            conversation = existingConv;
          } else {
            console.error('Error creating conversation:', conversationError);
            return new Response(JSON.stringify({ success: false, error: 'Failed to create conversation' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } else {
          conversation = newConversation;
        }
      }

      if (!conversation) {
        return new Response(JSON.stringify({ success: false, error: 'No conversation available' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Find replied message if this is a reply
      let repliedToMessageId: string | null = null;
      if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quotedMsgId = message.message.extendedTextMessage.contextInfo.stanzaId;
        if (quotedMsgId) {
          const { data: originalMsg } = await supabaseClient
            .from('wa_messages')
            .select('id')
            .eq('whatsapp_message_id', quotedMsgId)
            .single();
          if (originalMsg) repliedToMessageId = originalMsg.id;
        }
      }

      const whatsappTimestamp = message.messageTimestamp
        ? new Date(Number(message.messageTimestamp) * 1000).toISOString()
        : new Date().toISOString();

      // Upsert message with deduplication
      const messageData = {
        conversation_id: conversation.id,
        content: messageContent || (mediaInfo ? `[${messageType.toUpperCase()}]` : ''),
        direction,
        message_type: messageType,
        media_url: mediaUrl,
        delivery_status: direction === 'outbound' ? 'sent' : 'received',
        whatsapp_message_id: message.key?.id || null,
        replied_to_message_id: repliedToMessageId,
        created_at: whatsappTimestamp,
      };

      const { error: messageError } = await supabaseClient
        .from('wa_messages')
        .upsert(messageData, { onConflict: 'whatsapp_message_id', ignoreDuplicates: true });

      if (messageError) {
        console.error('Error saving message:', messageError);
      }

      // Update conversation last_message_at
      await supabaseClient
        .from('wa_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id);
    }

    // ============================================================
    // HANDLE: messages.update (delivery status)
    // ============================================================
    if (event === 'messages.update' && data?.msgId) {
      const msgId = String(data.msgId);
      const statusCode = data.status as number;

      const statusMap: Record<number, { status: string; level: number }> = {
        0: { status: 'failed', level: -1 },
        1: { status: 'pending', level: 0 },
        2: { status: 'sent', level: 1 },
        3: { status: 'delivered', level: 2 },
        4: { status: 'read', level: 3 },
        5: { status: 'read', level: 3 },
      };

      const newStatus = statusMap[statusCode];
      if (!newStatus) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: existingMessage } = await supabaseClient
        .from('wa_messages')
        .select('id, delivery_status')
        .eq('whatsapp_message_id', msgId)
        .maybeSingle();

      if (existingMessage) {
        const currentLevelMap: Record<string, number> = {
          pending: 0, sent: 1, delivered: 2, read: 3, failed: -1,
        };
        const currentLevel = currentLevelMap[existingMessage.delivery_status || 'pending'] ?? 0;

        if (newStatus.status !== 'failed' && newStatus.level < currentLevel) {
          return new Response(JSON.stringify({ success: true, skipped: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const updateData: any = { delivery_status: newStatus.status };
        const timestamp = new Date().toISOString();
        if (newStatus.status === 'delivered') updateData.delivered_at = timestamp;
        if (newStatus.status === 'read') updateData.read_at = timestamp;

        await supabaseClient
          .from('wa_messages')
          .update(updateData)
          .eq('id', existingMessage.id);
      }
    }

    // ============================================================
    // HANDLE: session.status
    // ============================================================
    if (event === 'session.status' && data) {
      const { data: whatsappNumber } = await supabaseClient
        .from('whatsapp_numbers')
        .select('id')
        .eq('api_key', payload.sessionId?.toString())
        .single();

      if (whatsappNumber) {
        const status = (data.status || '').toUpperCase();
        await supabaseClient
          .from('whatsapp_numbers')
          .update({
            status: status,
            is_connected: status === 'CONNECTED',
            last_connected_at: status === 'CONNECTED' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', whatsappNumber.id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
