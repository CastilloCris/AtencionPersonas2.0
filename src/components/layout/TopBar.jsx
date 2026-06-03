import React from 'react';

const TopBar = ({ activeScreen, onToggleSidebar, onLogout }) => {
  const titles = {
    screenDashboard: 'Dashboard',
    screenCases: 'Registro de atenciones',
    screenStats: 'Estadísticas',
    screenSearch: 'Búsqueda global',
    screenPersonDetail: 'Detalle de persona',
    screenMesaEntrada: 'Mesa de Entrada',
    screenDashboardIntendencia: 'Personas para atención',
    screenDashboardArea: 'Mi bandeja',
  };

  return (
    <header className="flex items-center justify-between py-5 border-b border-white/5 w-full">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2.5 bg-white/5 rounded-xl border border-white/8 text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-semibold text-white">{titles[activeScreen] || 'Dashboard'}</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
            <span className="text-[10px] text-muted tracking-wider">En línea</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onLogout} className="secondary px-4 py-2 text-sm">
          Cerrar sesión
        </button>
      </div>
    </header>
  );
};

export default TopBar;
