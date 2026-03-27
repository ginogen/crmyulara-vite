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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { name, phone_number, organization_id, branch_id } = await req.json();

    if (!organization_id) {
      return new Response(JSON.stringify({ error: 'organization_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get organization's Wasender token from organization_wasender_tokens table
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('organization_wasender_tokens')
      .select('wasender_personal_token')
      .eq('organization_id', organization_id)
      .single();

    if (tokenError || !tokenData?.wasender_personal_token) {
      return new Response(
        JSON.stringify({ error: 'Wasender token not configured for this organization. An admin must add it in Settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/wasender-webhook`;

    // Create session in Wasender — use messages.upsert (not messages.received)
    const wasenderResponse = await fetch('https://www.wasenderapi.com/api/whatsapp-sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.wasender_personal_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        phone_number,
        account_protection: true,
        log_messages: true,
        read_incoming_messages: false,
        auto_reject_calls: true,
        webhook_url: webhookUrl,
        webhook_enabled: true,
        webhook_events: ['messages.upsert', 'session.status', 'messages.update'],
      }),
    });

    const result = await wasenderResponse.json();
    console.log('Wasender create session response:', result);

    if (!wasenderResponse.ok) {
      return new Response(JSON.stringify({ error: result.message || 'Failed to create session' }), {
        status: wasenderResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save to whatsapp_numbers with multi-tenant fields
    const { data: whatsappNumber, error: dbError } = await supabaseClient
      .from('whatsapp_numbers')
      .insert({
        organization_id,
        branch_id: branch_id || null,
        created_by: user.id,
        display_name: name,
        phone_number,
        session_id: result.data.id.toString(),
        api_key: result.data.api_key,
        webhook_secret: result.data.webhook_secret,
        log_messages: true,
        status: result.data.status || 'disconnected',
        is_connected: false,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(JSON.stringify({ error: 'Failed to save session to database' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data: whatsappNumber }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
