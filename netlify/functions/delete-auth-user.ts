import { createClient } from '@supabase/supabase-js';

export async function handler(event: any) {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Método no permitido' }),
      };
    }

    const { email } = JSON.parse(event.body);

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email es requerido' }),
      };
    }

    // Crear cliente admin de Supabase
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Buscar el usuario por email en auth.users
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    if (userError) throw userError;

    const userToDelete = users.find(u => u.email === email);
    if (!userToDelete) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Usuario no encontrado en autenticación' }),
      };
    }

    // Eliminar el usuario de auth.users
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      userToDelete.id
    );

    if (deleteError) throw deleteError;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Usuario eliminado exitosamente' }),
    };
  } catch (error: any) {
    console.error('Error completo:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
} 