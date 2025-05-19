const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email, password, full_name, role, organization_id, branch_id } = JSON.parse(event.body);

  if (!password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'La contraseña es requerida' }),
    };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 1. Crear usuario en Auth con contraseña
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Confirmamos el email automáticamente
  });

  if (authError || !authUser?.user?.id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: authError?.message || 'Error creando usuario en Auth' }),
    };
  }

  // 2. Crear usuario en tabla users
  const { error } = await supabase
    .from('users')
    .insert({
      id: authUser.user.id,
      full_name,
      email,
      role,
      organization_id,
      branch_id,
    });

  if (error) {
    // Si falla la creación en la tabla users, intentamos eliminar el usuario de auth
    await supabase.auth.admin.deleteUser(authUser.user.id);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ 
      success: true,
      message: 'Usuario creado exitosamente'
    }),
  };
}; 