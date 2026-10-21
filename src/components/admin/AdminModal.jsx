import React, { useState, useEffect } from 'react';
import { supabase, crearClienteTemporal } from '../../lib/supabase';

// Textos legibles para la bitácora de auditoría
const ACCIONES = { INSERT: 'Alta', UPDATE: 'Cambio', DELETE: 'Baja' };
const ENTIDADES = {
  persons: 'Persona', cases: 'Caso', family_members: 'Familiar', audiencias: 'Audiencia', profiles: 'Usuario', areas: 'Área',
  as_construyendo_techo: 'Construyendo Techo', as_funebre: 'Servicio Fúnebre', as_modulos_alimenticios: 'Módulos Alimenticios',
  as_viajes_movil: 'Viaje Móvil', case_prestaciones: 'Prestación', cic_combustible: 'Combustible', cic_economico: 'Ayuda Económica',
  cic_medicamentos: 'Ayuda Medicamentos', cic_pasajes: 'Pasajes', farmacia_pacientes: 'Paciente Farmacia',
  farmacia_medicamentos: 'Medicación Farmacia', farmacia_entregas: 'Entrega Farmacia',
};

const AdminModal = ({ isOpen, onClose, areas, onRefreshAreas }) => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', fullName: '', role: 'operator', areaId: '' });
  const [availableAreas, setAvailableAreas] = useState([]);
  const [isAddingArea, setIsAddingArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAvailableAreas();
      if (activeTab === 'users') loadUsers();
      if (activeTab === 'audit') { loadAudit(); loadUsers(); }
    }
  }, [isOpen, activeTab]);

  const loadAvailableAreas = async () => {
    const { data } = await supabase.from('areas').select('*').eq('active', true).order('name');
    if (data) setAvailableAreas(data);
  };

  const loadUsers = async () => {
    setLoading(true);
    setStatus('Cargando usuarios...');
    const { data, error } = await supabase
      .from('profiles')
      .select('*, areas:default_area_id(name)')
      .order('full_name');
    
    if (error) setStatus(`Error: ${error.message}`);
    else { setUsers(data || []); setStatus(''); }
    setLoading(false);
  };

  const loadAudit = async () => {
    setLoading(true);
    setStatus('Cargando auditoría...');
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) setStatus(`Error: ${error.message}`);
    else { setAuditLogs(data || []); setStatus(''); }
    setLoading(false);
  };

  const handleUpdateUser = async (userId, updates) => {
    if (updates.is_active === false && !window.confirm('¿Suspender este usuario? Pierde el acceso de inmediato.')) return;
    const { data, error } = await supabase.from('profiles').update(updates).eq('user_id', userId).select('user_id');
    // Antes un error (o un cambio sin permiso) pasaba en silencio
    if (error) { setStatus(`Error: ${error.message}`); return; }
    if (!data || data.length === 0) { setStatus('No se pudo guardar el cambio (sin permiso).'); return; }
    setStatus('Cambio guardado.');
    loadUsers();
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Procesando registro...');
    
    try {
      // 1. Crear usuario en Auth con un cliente temporal (no toca la sesión del admin)
      const { data, error: authError } = await crearClienteTemporal().auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: { data: { full_name: newUser.fullName } },
      });

      if (authError) throw authError;
      // Supabase devuelve un usuario sin identidades cuando el email ya existe
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('Ese email ya está registrado.');
      }

      if (data?.user) {
        // 2. El trigger crea el perfil como operator INACTIVO (nadie elige su propio rol).
        //    El superadmin, con su sesión, le asigna rol y área y lo activa.
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: data.user.id,
            full_name: newUser.fullName,
            role: newUser.role,
            default_area_id: newUser.areaId || null,
            is_active: true,
          }, { onConflict: 'user_id' });

        if (profileError) throw profileError;

        setStatus('Usuario y perfil creados correctamente.');
        setIsAddingUser(false);
        setNewUser({ email: '', password: '', fullName: '', role: 'operator', areaId: '' });
        loadUsers();
      }
    } catch (err) {
      console.error("Error al crear usuario:", err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArea = async (e) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    setLoading(true);
    setStatus('Creando área...');
    
    try {
      const { error } = await supabase.from('areas').insert({
        name: newAreaName.trim(),
        active: true
      });
      
      if (error) throw error;
      
      setStatus('Área creada exitosamente.');
      setNewAreaName('');
      setIsAddingArea(false);
      loadAvailableAreas();
      if (onRefreshAreas) onRefreshAreas();
    } catch (err) {
      console.error("Error al crear área:", err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-2000 flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-300">
      <div className="bg-(--card) w-full h-full md:max-w-[1100px] md:h-auto md:max-h-[90vh] overflow-hidden md:rounded-[32px] border-x border-y md:border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col">
        {/* Header */}
        <div className="p-4 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/2">
          <div className="flex flex-col">
            <h2 className="text-xl md:text-2xl font-black tracking-tight">Panel de Administración</h2>
            <p className="text-[9px] md:text-[10px] uppercase font-bold text-(--accent) tracking-widest">Configuración y auditoría</p>
          </div>
          <button className="danger p-2 md:p-3! rounded-xl md:rounded-2xl min-h-[44px] min-w-[44px]" onClick={onClose}>
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 md:px-8 bg-white/1 border-b border-white/5 flex gap-4 md:gap-8 overflow-x-auto no-scrollbar">
          {['users', 'areas', 'audit'].map(tab => (
            <button 
              key={tab}
              className={`py-4 text-xs md:text-xs uppercase font-black tracking-widest border-b-2 transition-all whitespace-nowrap min-h-[44px] ${activeTab === tab ? 'border-(--accent) text-(--accent)' : 'border-transparent text-(--muted) hover:text-white'}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'users' ? 'Usuarios' : tab === 'areas' ? 'Áreas' : 'Auditoría'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-bold">Gestión de Operadores</h3>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button className="primary text-xs px-4! py-3! flex-1 sm:flex-none min-h-[44px]" onClick={() => setIsAddingUser(true)}>
                    + Nuevo Usuario
                  </button>
                  <button className="secondary text-xs px-4! py-3! flex-1 sm:flex-none min-h-[44px]" onClick={loadUsers}>
                    Actualizar
                  </button>
                </div>
              </div>

              {isAddingUser && (
                <div className="p-4 md:p-6 rounded-2xl bg-accent/5 border border-accent/20 animate-in slide-in-from-top-4 duration-300">
                  <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted">Nombre Completo</label>
                      <input 
                        required
                        className="bg-white/5 border-white/10 py-3! text-sm min-h-[44px]"
                        value={newUser.fullName}
                        onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted">Email</label>
                      <input 
                        type="email"
                        required
                        className="bg-white/5 border-white/10 py-3! text-sm min-h-[44px]"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted">Contraseña</label>
                      <input 
                        type="password"
                        required
                        className="bg-white/5 border-white/10 py-3! text-sm min-h-[44px]"
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted">Rol</label>
                      <select 
                        className="bg-white/5 border-white/10 py-3! text-sm min-h-[44px]"
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                      >
                        <option value="operator">Operador</option>
                        <option value="admin">Administrador</option>
                        <option value="superadmin">SuperAdmin</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted">Área</label>
                      <select 
                        className="bg-white/5 border-white/10 py-3! text-sm min-h-[44px]"
                        value={newUser.areaId}
                        onChange={(e) => setNewUser({...newUser, areaId: e.target.value})}
                      >
                        <option value="">Sin área</option>
                        {availableAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 pt-2 sm:pt-0">
                      <button type="submit" disabled={loading} className="primary flex-1 py-3! text-xs font-bold uppercase tracking-widest min-h-[44px]">
                        {loading ? 'Creando...' : 'Guardar Usuario'}
                      </button>
                      <button type="button" className="secondary py-3! text-xs font-bold uppercase tracking-widest min-h-[44px]" onClick={() => setIsAddingUser(false)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}
              {/* Celular: una tarjeta por usuario */}
              <div className="md:hidden space-y-3">
                {users.map(u => (
                  <div key={u.user_id} className={`rounded-2xl border p-4 space-y-3 ${u.is_active ? 'bg-white/3 border-white/10' : 'bg-red-500/5 border-red-500/25'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-white text-base break-words">{u.full_name || 'Sin nombre'}</p>
                        <p className="text-sm text-muted">{u.areas?.name || 'Sin área asignada'}</p>
                      </div>
                      <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-md border ${u.is_active ? 'bg-teal-500/10 text-teal-300 border-teal-500/30' : 'bg-red-500/10 text-red-300 border-red-500/30'}`}>
                        {u.is_active ? 'Activo' : 'Suspendido'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor={`rol-${u.user_id}`}>Rol</label>
                        <select id={`rol-${u.user_id}`} className="tap" value={u.role} onChange={(e) => handleUpdateUser(u.user_id, { role: e.target.value })}>
                          <option value="operator">Operador</option>
                          <option value="admin">Administrador</option>
                          <option value="superadmin">SuperAdmin</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`area-${u.user_id}`}>Área</label>
                        <select id={`area-${u.user_id}`} className="tap" value={u.default_area_id || ''} onChange={(e) => handleUpdateUser(u.user_id, { default_area_id: e.target.value || null })}>
                          <option value="">Sin área</option>
                          {availableAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <button
                      className={`${u.is_active ? 'danger' : 'primary'} tap w-full text-sm`}
                      onClick={() => handleUpdateUser(u.user_id, { is_active: !u.is_active })}
                    >
                      {u.is_active ? 'Suspender' : 'Activar'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="hidden md:block tableWrap shadow-2xl overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr><th>Usuario</th><th>Rol</th><th>Área Asignada</th><th>Estado</th><th>Acciones</th></tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.user_id}>
                        <td className="py-4">
                          <div className="font-bold text-white">{u.full_name || 'Sin nombre'}</div>
                          <div className="text-[10px] text-(--muted) uppercase font-bold tracking-tight">
                            {u.areas?.name || 'Sin área asignada'}
                          </div>
                          <div className="text-[9px] font-mono text-(--muted) uppercase">{u.user_id}</div>
                        </td>
                        <td>
                          <select 
                            className="text-xs py-1! px-2! bg-white/5 min-h-[36px]" 
                            value={u.role} 
                            onChange={(e) => handleUpdateUser(u.user_id, { role: e.target.value })}
                          >
                            <option value="operator">Operador</option>
                            <option value="admin">Administrador</option>
                            <option value="superadmin">SuperAdmin</option>
                          </select>
                        </td>
                         <td>
                          <select 
                            className="text-xs py-1! px-2! bg-white/5 min-h-[36px]" 
                            value={u.default_area_id || ''}
                            onChange={(e) => handleUpdateUser(u.user_id, { default_area_id: e.target.value || null })}
                          >
                            <option value="">Sin área</option>
                            {availableAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                        </td>
                        <td>
                          <span className={`pill ${u.is_active ? '' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            {u.is_active ? 'Activo' : 'Suspendido'}
                          </span>
                        </td>
                        <td>
                          <button 
                            className={`${u.is_active ? 'danger' : 'primary'} py-2! px-3! text-[10px] uppercase font-bold min-h-[36px]`}
                            onClick={() => handleUpdateUser(u.user_id, { is_active: !u.is_active })}
                          >
                            {u.is_active ? 'Suspender' : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'areas' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Configuración de Áreas</h3>
                <button 
                  className="primary text-xs px-4! py-3! min-h-[44px]" 
                  onClick={() => setIsAddingArea(prev => !prev)}
                >
                  {isAddingArea ? 'Cancelar' : '+ Nueva área'}
                </button>
              </div>

              {isAddingArea && (
                <div className="p-4 md:p-6 rounded-[24px] bg-white/2 border border-(--accent)/20 animate-in slide-in-from-top-2 duration-300">
                  <form onSubmit={handleCreateArea} className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <input 
                        placeholder="Nombre de la nueva área..." 
                        className="w-full bg-white/5 border-white/10 py-3! min-h-[44px]"
                        value={newAreaName}
                        onChange={(e) => setNewAreaName(e.target.value)}
                        required
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="primary px-8! py-3! min-h-[44px]"
                      disabled={loading || !newAreaName.trim()}
                    >
                      {loading ? '...' : 'Guardar'}
                    </button>
                  </form>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableAreas.map(a => (
                  <div key={a.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm">{a.name}</div>
                      <div className="text-[10px] text-(--muted)">ID: {a.id}</div>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${a.active ? 'bg-(--accent)' : 'bg-red-500'}`}></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold">Bitácora de Eventos</h3>
              <div className="md:hidden space-y-2">
                {auditLogs.length === 0 && <p className="text-sm text-muted text-center py-8">Sin eventos registrados.</p>}
                {auditLogs.map(l => (
                  <div key={l.id} className="rounded-xl border border-white/10 bg-white/3 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">
                        {ACCIONES[l.action] || l.action} · {ENTIDADES[l.entity] || l.entity}
                      </span>
                      <span className="text-xs text-muted whitespace-nowrap">{new Date(l.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm text-white/70 mt-0.5">
                      {users.find(u => u.user_id === l.actor_id)?.full_name || (l.actor_id ? l.actor_id.slice(0, 8) : 'Sistema')}
                    </p>
                    {l.meta?.campos && <p className="text-xs text-muted mt-0.5">Cambió: {l.meta.campos.join(', ')}</p>}
                  </div>
                ))}
              </div>
              <div className="hidden md:block tableWrap shadow-2xl overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead><tr><th>Fecha / Hora</th><th>Acción</th><th>Entidad</th><th>Operador</th></tr></thead>
                  <tbody>
                    {auditLogs.map(l => (
                      <tr key={l.id}>
                        <td className="text-[11px] font-mono py-4 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                        <td><span className="pill text-[10px] uppercase">{ACCIONES[l.action] || l.action}</span></td>
                        <td className="text-xs text-(--muted)">{ENTIDADES[l.entity] || l.entity}</td>
                        <td className="text-xs">
                          {users.find(u => u.user_id === l.actor_id)?.full_name || (l.actor_id ? l.actor_id.slice(0, 8) : 'Sistema')}
                          {l.meta?.campos && (
                            <span className="block text-[10px] text-(--muted)">Cambió: {l.meta.campos.join(', ')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-black/20 text-center border-t border-white/5">
          <p className="text-xs text-(--muted) font-semibold" role="status">{status || 'Listo'}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminModal;
