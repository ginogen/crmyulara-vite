const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { userId, email } = JSON.parse(event.body);

  if (!userId || !email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'userId y email son requeridos' }),
    };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      email: email,
      email_confirm: true
    });

    if (error) {
      console.error('Error actualizando email en auth:', error);
      throw error;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Email actualizado en auth exitosamente',
      }),
    };
  } catch (error) {
    console.error('Error completo:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'Error al actualizar email en auth',
        details: error.toString()
      }),
    };
  }
};
