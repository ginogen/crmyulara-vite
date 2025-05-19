const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email } = JSON.parse(event.body);

  if (!email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Email es requerido' }),
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
    // Primero obtenemos el usuario de nuestra tabla users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError) {
      console.error('Error buscando usuario:', userError);
      throw new Error('Error buscando usuario en la base de datos');
    }

    if (!userData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Usuario no encontrado' }),
      };
    }

    // Actualizar el usuario para confirmar su email usando el ID
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userData.id,
      { email_confirm: true }
    );

    if (updateError) {
      console.error('Error actualizando usuario:', updateError);
      throw updateError;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Email confirmado exitosamente'
      }),
    };
  } catch (error) {
    console.error('Error completo:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message || 'Error al confirmar email',
        details: error.toString()
      }),
    };
  }
}; 