export function LoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <h2 className="mt-4 text-xl font-semibold text-gray-700">Cargando...</h2>
        <p className="mt-2 text-gray-500">Por favor espere mientras se cargan los datos.</p>
      </div>
    </div>
  );
} 