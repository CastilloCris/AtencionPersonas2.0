import React from 'react';

const TopBar = ({ activeScreen, onToggleSidebar, onLogout, unreadCount = 0 }) => {
  const titles = {
    screenDashboard: 'Dashboard',
    screenCases: 'Registro de atenciones',
    screenStats: 'Estadísticas',
    screenSearch: 'Búsqueda global',
    screenPersonDetail: 'Detalle de persona',
    screenMesaEntrada: 'Mesa de Entrada',
    screenDashboardIntendencia: 'Personas para atención',
    screenDashboardArea: 'Mi bandeja',
    screenDashboardFarmacia: 'Farmacia Municipal',
  };

  return (
    <header className="flex items-center justify-between py-3 md:py-5 border-b border-white/5 w-full">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden relative p-2.5 bg-white/5 rounded-xl border border-white/8 text-white tap min-w-[44px]"
          aria-label={unreadCount > 0 ? `Abrir menú (${unreadCount} derivaciones nuevas)` : 'Abrir menú'}
        >
          {/* En celular el menú está oculto: el aviso de derivaciones nuevas va sobre el botón */}
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
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

      {/* En celular "Cerrar sesión" queda en el menú lateral: libera espacio en el encabezado */}
      <div className="hidden sm:flex items-center gap-3">
        <button onClick={onLogout} className="secondary px-4 py-2 text-sm">
          Cerrar sesión
        </button>
      </div>
    </header>
  );
};

export default TopBar;
