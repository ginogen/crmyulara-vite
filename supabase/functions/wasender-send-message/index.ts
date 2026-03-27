import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      whatsapp_number_id,
      to,
      message,
      type = 'text',
      media,
      mimetype,
      filename,
      conversation_id,
      replied_to_message_id,
      media_url,
    } = await req.json();

    const base64ToBlob = (base64: string, mimeType: string): Blob => {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
    };

    const getFileExtension = (mimetype: string): string => {
      const map: Record<string, string> = {
        'application/pdf': 'pdf',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'video/mp4': 'mp4',
        'audio/ogg': 'ogg',
        'audio/mpeg': 'mp3',
        'audio/webm': 'webm',
      };
      return map[mimetype] || 'bin';
    };

    const { data: whatsappNumber, error: whatsappError } = await supabaseClient
      .from('whatsapp_numbers')
      .select('*')
      .eq('id', whatsapp_number_id)
      .single();

    if (whatsappError || !whatsappNumber?.api_key) {
      return new Response(JSON.stringify({ error: 'WhatsApp number not found or not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get whatsapp_message_id of replied message
    let replyToMsgId: string | null = null;
    if (replied_to_message_id) {
      const { data: repliedMessage } = await supabaseClient
        .from('wa_messages')
        .select('whatsapp_message_id')
        .eq('id', replied_to_message_id)
        .single();
      if (repliedMessage?.whatsapp_message_id) {
        replyToMsgId = repliedMessage.whatsapp_message_id;
      }
    }

    let wasenderPayload: any = {
      to: `${to.replace('+', '')}@s.whatsapp.net`,
    };

    if (replyToMsgId) {
      wasenderPayload.replyTo = replyToMsgId;
    }

    let uploadedMediaUrl: string | null = null;
    let fileSize: number | undefined;

    if (type === 'text') {
      wasenderPayload.text = message;
    } else if (media_url) {
      uploadedMediaUrl = media_url;
      if (type === 'image') {
        wasenderPayload.imageUrl = media_url;
        if (message) wasenderPayload.caption = message;
      } else if (type === 'video') {
        wasenderPayload.videoUrl = media_url;
        if (message) wasenderPayload.caption = message;
      } else if (type === 'audio') {
        wasenderPayload.audioUrl = media_url;
      } else if (type === 'document') {
        wasenderPayload.documentUrl = media_url;
        wasenderPayload.fileName = filename || 'file';
        if (message) wasenderPayload.text = message;
      }
    } else if (media) {
      try {
        const blob = base64ToBlob(media, mimetype);
        fileSize = blob.size;
        const extension = getFileExtension(mimetype);
        const uniqueFileName = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
        const filePath = `${type}s/${uniqueFileName}`;

        const { error: uploadError } = await supabaseClient.storage
          .from('whatsapp-media')
          .upload(filePath, blob, { contentType: mimetype, upsert: false });

        if (uploadError) throw new Error(`Failed to upload: ${uploadError.message}`);

        const { data: publicUrlData } = supabaseClient.storage
          .from('whatsapp-media')
          .getPublicUrl(filePath);

        uploadedMediaUrl = publicUrlData.publicUrl;

        if (type === 'image') {
          wasenderPayload.imageUrl = uploadedMediaUrl;
          if (message) wasenderPayload.caption = message;
        } else if (type === 'video') {
          wasenderPayload.videoUrl = uploadedMediaUrl;
          if (message) wasenderPayload.caption = message;
        } else if (type === 'audio') {
          wasenderPayload.audioUrl = uploadedMediaUrl;
        } else if (type === 'document') {
          wasenderPayload.documentUrl = uploadedMediaUrl;
          wasenderPayload.fileName = filename || uniqueFileName;
          if (message) wasenderPayload.text = message;
        }
      } catch (storageError) {
        return new Response(JSON.stringify({ error: `Failed to upload ${type} to storage` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const wasenderResponse = await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappNumber.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(wasenderPayload),
    });

    const result = await wasenderResponse.json();

    if (!wasenderResponse.ok) {
      const errorMessage = result.message || 'Failed to send message';
      let userFriendlyError = errorMessage;
      let errorCode = 'SEND_FAILED';

      if (errorMessage.includes('JID does not exist') || errorMessage.includes('not registered')) {
        userFriendlyError = 'Este número no existe en WhatsApp o te ha bloqueado.';
        errorCode = 'NUMBER_NOT_ON_WHATSAPP';
      } else if (errorMessage.includes('session') && (errorMessage.includes('expired') || errorMessage.includes('disconnected'))) {
        userFriendlyError = 'La sesión de WhatsApp expiró. Reconecta el número.';
        errorCode = 'SESSION_EXPIRED';
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
        userFriendlyError = 'Demasiados mensajes enviados. Espera un momento.';
        errorCode = 'RATE_LIMIT';
      }

      return new Response(JSON.stringify({ error: userFriendlyError, errorCode, originalError: errorMessage }), {
        status: wasenderResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const whatsappMessageId =
      result.data?.msgId ? String(result.data.msgId) :
      result.msgId ? String(result.msgId) :
      result.data?.key?.id ? String(result.data.key.id) :
      null;

    const performDbOperations = async () => {
      try {
        const serviceClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const messageData: any = {
          conversation_id,
          content: message || (type === 'document' ? filename : ''),
          direction: 'outbound',
          message_type: type,
          sent_by: user.id,
          delivery_status: whatsappMessageId ? 'sent' : 'pending',
          whatsapp_message_id: whatsappMessageId,
          sent_at: new Date().toISOString(),
          replied_to_message_id: replied_to_message_id || null,
        };

        if (uploadedMediaUrl) messageData.media_url = uploadedMediaUrl;

        if (type !== 'text') {
          messageData.metadata = { filename, mimetype, fileSize };
        }

        await serviceClient.from('wa_messages').upsert(messageData, {
          onConflict: 'whatsapp_message_id',
          ignoreDuplicates: true,
        });

        await serviceClient
          .from('wa_conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversation_id);
      } catch (bgError) {
        console.error('DB operation failed:', bgError);
      }
    };

    const responseBody = JSON.stringify({
      success: true,
      data: result,
      messageId: whatsappMessageId,
      mediaUrl: uploadedMediaUrl,
    });

    const response = new Response(responseBody, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    if (conversation_id) {
      EdgeRuntime.waitUntil(performDbOperations());
    }

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
