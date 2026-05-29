export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 shadow-2xl">
      <h2 className="text-4xl font-bold mb-4">404 - Not Found</h2>
      <p className="mb-6 text-asas-silver">L'entité ou la ressource que vous avez demandée n'existe pas.</p>
      <a href="/dashboard" className="px-4 py-2 bg-asas-navy text-white rounded-lg font-bold tracking-wide uppercase text-xs">
        Retourner au tableau de bord
      </a>
    </div>
  );
}
