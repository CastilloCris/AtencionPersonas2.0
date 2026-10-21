import React, { useState } from 'react';

const PRIORIDAD_COLOR = {
  urgente: 'text-red-400',
  alta: 'text-amber-400',
  normal: 'text-accent',
  baja: 'text-white/40',
};

const NotificationPanel = ({ notifications, onClear, onMarkAllRead, onNavigate }) => (
  <div className="absolute left-full top-0 ml-3 w-80 bg-panel border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
      <span className="text-xs font-black text-white uppercase tracking-widest">Derivaciones nuevas</span>
      <button
        onClick={onMarkAllRead}
        className="text-[10px] text-accent font-bold uppercase tracking-widest hover:text-white transition-colors"
      >
        Marcar leídas
      </button>
    </div>
    <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-white/5">
      {notifications.length === 0 ? (
        <p className="text-center text-xs text-muted py-8 italic opacity-50">Sin notificaciones nuevas</p>
      ) : (
        notifications.map(n => (
          <div
            key={n.id}
            className="px-4 py-3 hover:bg-white/4 transition-colors cursor-pointer group"
            onClick={() => { onNavigate('screenDashboardArea'); onMarkAllRead(); }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-bold truncate">{n.personaNombre}</p>
                <p className="text-muted text-[10px] font-mono">DNI {n.personaDni}</p>
                <p className="text-white/40 text-[10px] mt-1 truncate">{n.motivo}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                    Desde: {n.areaNombre}
                  </span>
                  <span className={`text-[9px] font-bold ${PRIORIDAD_COLOR[n.prioridad] || 'text-accent'}`}>
                    {n.prioridad}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-[9px] text-muted/40 font-mono whitespace-nowrap">
                  {n.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); onClear(n.id); }}
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-white transition-all text-[10px]"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
    {notifications.length > 0 && (
      <div className="px-4 py-2 border-t border-white/8">
        <button
          onClick={() => { onNavigate('screenDashboardArea'); onMarkAllRead(); }}
          className="w-full text-center text-[10px] text-accent font-bold uppercase tracking-widest hover:text-white transition-colors py-1"
        >
          Ver Mi Bandeja →
        </button>
      </div>
    )}
  </div>
);

const Sidebar = ({
  profile,
  activeScreen,
  setActiveScreen,
  isOpen,
  setIsOpen,
  onOpenAdmin,
  onOpenPeople,
  onLogout,
  // Nuevas props de notificaciones
  unreadCount = 0,
  notifications = [],
  onMarkAllRead,
  onClearNotification,
}) => {
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const areaName = profile?.areas?.name || '';
  const isSuperAdmin = profile?.role === 'superadmin';
  const isOperator = profile?.role === 'operator';
  const normalizedArea = areaName.trim().toLowerCase();
  const isIntendencia = normalizedArea === 'intendencia';
  const isMesaEntrada = normalizedArea === 'mesa de entrada';
  const isFarmacia = normalizedArea === 'farmacia';
  const isRestrictedArea = isIntendencia || isMesaEntrada || isFarmacia;
  const isArea = !isSuperAdmin && !isMesaEntrada && !isIntendencia && !isFarmacia && !!profile?.areas?.id;

  // Solo los operadores de área y superadmin ven notificaciones de derivaciones
  const showNotifications = isSuperAdmin || isArea;

  const menuItems = [];

  if (isSuperAdmin || (!isRestrictedArea && !isOperator)) {
    menuItems.push(
      { id: 'screenDashboard', label: 'Nuevo caso', target: 'sectionNewCase' },
    );
  }

  // Mis Casos y Estadísticas: admin, superadmin y operator
  if (isSuperAdmin || !isRestrictedArea) {
    menuItems.push(
      { id: 'screenCases', label: 'Mis casos' },
      { id: 'screenStats', label: 'Estadísticas' },
    );
  }

  // Todos ven Búsqueda Global
  menuItems.push({ id: 'screenSearch', label: 'Búsqueda global' });

  if (isSuperAdmin || isMesaEntrada) {
    menuItems.push({ id: 'screenMesaEntrada', label: 'Mesa de Entrada' });
  }

  if (isSuperAdmin || isIntendencia) {
    menuItems.push({ id: 'screenDashboardIntendencia', label: 'Personas Para atención' });
  }

  if (isSuperAdmin || isFarmacia) {
    menuItems.push({ id: 'screenDashboardFarmacia', label: 'Farmacia Municipal' });
  }

  if (isSuperAdmin || isArea) {
    menuItems.push({ id: 'screenDashboardArea', label: 'Mi Bandeja', hasNotif: true });
  }

  const handleNavClick = (id, target) => {
    setActiveScreen(id);
    setShowNotifPanel(false);
    if (target) {
      setTimeout(() => {
        const el = document.getElementById(target);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  const handleNotifButtonClick = (e) => {
    e.stopPropagation();
    setShowNotifPanel(prev => !prev);
    if (!showNotifPanel && onMarkAllRead) onMarkAllRead();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-1000 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Click fuera cierra el panel de notificaciones */}
      {showNotifPanel && (
        <div className="fixed inset-0 z-40" onClick={() => setShowNotifPanel(false)} />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-72 bg-panel border-r border-white/10 z-1001 flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/escudo.png"
              alt="Escudo municipal"
              className="w-11 h-11 object-contain shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-xl font-black text-white tracking-tight italic leading-none">Ficha Social</h1>
              <p className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mt-1">Municipalidad</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 text-muted hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User Profile */}
        <div className="p-4 mx-4 my-6 rounded-2xl bg-white/3 border border-white/5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-accent to-accent2 flex items-center justify-center text-panel font-black text-xl shadow-lg">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-white truncate uppercase tracking-tight">{profile?.full_name || 'Operador'}</div>
              <div className="text-[9px] text-accent font-black uppercase tracking-[0.15em] mt-0.5">
                {areaName || profile?.role}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          <div className="px-4 mb-2 text-[10px] font-black text-muted/30 uppercase tracking-[0.25em]">Principal</div>
          {menuItems.map((item, idx) => {
            const isActive = activeScreen === item.id;
            // "Mi Bandeja" con notificaciones
            const showBadge = item.hasNotif && showNotifications && unreadCount > 0;

            return (
              <div key={`${item.id}-${idx}`} className="relative">
                <button
                  onClick={() => handleNavClick(item.id, item.target)}
                  className={`
                    w-full flex items-center justify-between px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all min-h-[48px]
                    ${isActive
                      ? 'bg-accent text-panel shadow-[0_0_20px_rgba(46,204,113,0.3)]'
                      : 'text-muted hover:bg-white/5 hover:text-white'}
                  `}
                >
                  <span>{item.label}</span>

                  {/* Badge de notificaciones estilo WhatsApp */}
                  {showBadge && (
                    <span
                      className={`
                        flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black
                        ${isActive
                          ? 'bg-panel text-accent'
                          : 'bg-accent text-panel'}
                        animate-[pulse_2s_ease-in-out_infinite]
                      `}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Botón de campana para ver el panel sin navegar */}
                {item.hasNotif && showNotifications && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 z-50">
                    {showBadge && (
                      <button
                        onClick={handleNotifButtonClick}
                        className="relative p-1.5 rounded-xl hover:bg-white/10 transition-colors"
                        title="Ver notificaciones"
                      >
                        {/* El badge ya está en el botón principal; aquí solo la campana */}
                      </button>
                    )}
                  </div>
                )}

                {/* Panel de notificaciones desplegable */}
                {item.hasNotif && showNotifPanel && (
                  <div className="relative z-50">
                    <NotificationPanel
                      notifications={notifications}
                      onClear={onClearNotification}
                      onMarkAllRead={() => { onMarkAllRead?.(); setShowNotifPanel(false); }}
                      onNavigate={(screen) => { setActiveScreen(screen); setShowNotifPanel(false); if (window.innerWidth < 1024) setIsOpen(false); }}
                    />
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-6 mt-6 border-t border-white/5">
            <div className="px-4 mb-3 text-[10px] font-black text-muted/30 uppercase tracking-[0.25em]">Administración</div>
            <button
              onClick={() => { onOpenPeople(); if (window.innerWidth < 1024) setIsOpen(false); }}
              className="w-full flex items-center px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-muted hover:bg-white/5 hover:text-white min-h-[48px]"
            >
              Gestión de Personas
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => { onOpenAdmin(); if (window.innerWidth < 1024) setIsOpen(false); }}
                className="w-full flex items-center px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-muted hover:bg-white/5 hover:text-white min-h-[48px] mt-2"
              >
                Panel de Control
              </button>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <button onClick={onLogout} className="danger w-full py-4! text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl min-h-[50px]">
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
