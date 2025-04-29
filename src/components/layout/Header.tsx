import { useAuth } from '../../contexts/AuthContext';

export default function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-white shadow">
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-800">
            {user?.user_metadata?.full_name}
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => signOut()}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
} 