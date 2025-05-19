const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email, newPassword } = JSON.parse(event.body);

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
    // 1. Obtener usuario de nuestra tabla users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (userError) {
      console.error('Error buscando usuario en tabla users:', userError);
      throw new Error('Error buscando usuario en la base de datos');
    }

    if (!userData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Usuario no encontrado en la tabla users' }),
      };
    }

    // 2. Asegurarnos que el usuario existe en auth.users y está confirmado
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userData.id,
      { 
        email_confirm: true,
        password: newPassword // Solo se actualiza si se proporciona una nueva contraseña
      }
    );

    if (updateError) {
      console.error('Error actualizando usuario en auth:', updateError);
      throw updateError;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Usuario reparado exitosamente. Ahora debería poder acceder.',
        details: {
          email_confirmed: true,
          password_updated: !!newPassword
        }
      }),
    };
  } catch (error) {
    console.error('Error completo:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message || 'Error al reparar usuario',
        details: error.toString()
      }),
    };
  }
}; 