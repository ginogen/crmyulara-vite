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

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { session_id } = await req.json();

    const { data: whatsappNumber, error: whatsappError } = await serviceClient
      .from('whatsapp_numbers')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (whatsappError || !whatsappNumber) {
      return new Response(JSON.stringify({ error: 'WhatsApp session not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get API token: prefer org token, fallback to api_key
    let apiToken = whatsappNumber.api_key;
    const { data: tokenData } = await serviceClient
      .from('organization_wasender_tokens')
      .select('wasender_personal_token')
      .eq('organization_id', whatsappNumber.organization_id)
      .single();

    if (tokenData?.wasender_personal_token) {
      apiToken = tokenData.wasender_personal_token;
    }

    if (!apiToken) {
      return new Response(JSON.stringify({ error: 'No Wasender API token configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const wasenderResponse = await fetch(
      `https://www.wasenderapi.com/api/whatsapp-sessions/${session_id}/connect`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await wasenderResponse.json();

    if (!wasenderResponse.ok) {
      return new Response(JSON.stringify({ error: result.message || 'Failed to connect session' }), {
        status: wasenderResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
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
