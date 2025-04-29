import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-800">404</h1>
        <h2 className="text-2xl font-semibold text-gray-600 mt-4">
          Página no encontrada
        </h2>
        <p className="text-gray-500 mt-2">
          Lo sentimos, la página que estás buscando no existe.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
} 