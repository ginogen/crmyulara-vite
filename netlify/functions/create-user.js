const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email, full_name, role, organization_id, branch_id } = JSON.parse(event.body);

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 1. Crear usuario en Auth
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false,
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
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
}; 