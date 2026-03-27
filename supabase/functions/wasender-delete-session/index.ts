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

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { whatsapp_number_id } = await req.json();
    if (!whatsapp_number_id) {
      return new Response(JSON.stringify({ error: 'whatsapp_number_id es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get whatsapp number (RLS ensures org access)
    const { data: whatsappNumber, error: numberError } = await supabaseClient
      .from('whatsapp_numbers')
      .select('session_id, created_by, organization_id')
      .eq('id', whatsapp_number_id)
      .single();

    if (numberError || !whatsappNumber) {
      return new Response(JSON.stringify({ error: 'Número no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check permissions: must be creator or admin/org_admin
    const { data: userData } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userData?.role === 'super_admin' || userData?.role === 'org_admin';
    const isCreator = whatsappNumber.created_by === user.id;

    if (!isAdmin && !isCreator) {
      return new Response(JSON.stringify({ error: 'No tienes permiso para eliminar este número' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!whatsappNumber.session_id) {
      return new Response(JSON.stringify({ success: true, message: 'No hay sesión activa en Wasender', skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Wasender token
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: tokenData } = await serviceClient
      .from('organization_wasender_tokens')
      .select('wasender_personal_token')
      .eq('organization_id', whatsappNumber.organization_id)
      .single();

    if (!tokenData?.wasender_personal_token) {
      return new Response(JSON.stringify({ error: 'Token de Wasender no configurado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const wasenderResponse = await fetch(
      `https://www.wasenderapi.com/api/whatsapp-sessions/${whatsappNumber.session_id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokenData.wasender_personal_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (wasenderResponse.status === 204) {
      return new Response(JSON.stringify({ success: true, message: 'Sesión eliminada de Wasender correctamente' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (wasenderResponse.status === 404) {
      return new Response(JSON.stringify({ success: true, message: 'La sesión ya no existe en Wasender', code: 404 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      const errorText = await wasenderResponse.text();
      return new Response(JSON.stringify({
        error: `Error de Wasender API (${wasenderResponse.status})`,
        details: errorText,
        code: wasenderResponse.status,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
