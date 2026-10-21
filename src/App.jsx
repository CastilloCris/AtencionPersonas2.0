import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Login from './components/Auth/Login';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Dashboard from './components/Dashboard/Dashboard';
import CasesList from './components/Cases/CasesList';
import StatsDashboard from './components/Stats/StatsDashboard';
import GlobalSearch from './components/Search/GlobalSearch';
import PersonDetail from './components/PersonDetail/PersonDetail';
import AdminModal from './components/admin/AdminModal';
import PeopleModal from './components/People/PeopleModal';
import SelectorPrestacionesModal from './components/Prestaciones/SelectorPrestacionesModal';
import PrestacionModal from './components/Prestaciones/PrestacionModal';
import MesaEntrada from './components/MesaEntrada';
import DashboardIntendencia from './components/DashboardIntendencia';
import DashboardArea from './components/DashboardArea';
import DashboardFarmacia from './components/DashboardFarmacia';
import { useNotifications } from './lib/useNotifications';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeScreen, setActiveScreen] = useState('screenDashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isPeopleModalOpen, setIsPeopleModalOpen] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [personDetailOrigin, setPersonDetailOrigin] = useState('screenDashboard');
  const [currentPerson, setCurrentPerson] = useState(null);
  const [lastCaseId, setLastCaseId] = useState(null);
  const [selectorCaseId, setSelectorCaseId] = useState(null);
  const [editRecord, setEditRecord] = useState(null); // { formType, data, recordId, tabla, nombre }
  const [areas, setAreas] = useState([]);
  // Se incrementa al cerrar el modal de prestaciones para que el historial se recargue
  const [prestacionesVersion, setPrestacionesVersion] = useState(0);

  const areaName = profile?.areas?.name || '';
  const isSuperAdmin = profile?.role === 'superadmin';
  const normalizedArea = areaName.trim().toLowerCase();
  const isMesaEntrada = normalizedArea === 'mesa de entrada';
  const isIntendencia = normalizedArea === 'intendencia';
  const isFarmacia = normalizedArea === 'farmacia';
  const isArea = !isSuperAdmin && !isMesaEntrada && !isIntendencia && !isFarmacia && !!profile?.areas?.id;

  // ── Notificaciones en tiempo real ─────────────────────────────────────────
  const { unreadCount, notifications, markAllRead, clearNotification } = useNotifications(profile);

  // Cuando el usuario navega a "Mi Bandeja" marcamos todo como leído
  useEffect(() => {
    if (activeScreen === 'screenDashboardArea') {
      markAllRead();
    }
  }, [activeScreen]);
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, areas!default_area_id(id, name)')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      if (!data || data.is_active !== true) {
        await supabase.auth.signOut();
        alert('Tu cuenta no está activa. Pedile al administrador del sistema que la active.');
        return;
      }
      setProfile(data);
      loadAreas();
      // Auto redirect según rol/área
      const name = data?.areas?.name?.trim().toLowerCase() || '';
      const role = data?.role || '';
      if (role !== 'superadmin') {
        if (role === 'operator') {
          setActiveScreen('screenCases');
        } else if (name === 'mesa de entrada') {
          setActiveScreen('screenMesaEntrada');
        } else if (name === 'intendencia') {
          setActiveScreen('screenDashboardIntendencia');
        } else if (name === 'farmacia') {
          setActiveScreen('screenDashboardFarmacia');
        } else if (data?.areas?.id) {
          setActiveScreen('screenDashboardArea');
        }
      }
    } catch (e) { console.error(e); }
  };

  const loadAreas = async () => {
    const { data } = await supabase.from('areas').select('*').eq('active', true).order('name');
    if (data) setAreas(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setActiveScreen('screenDashboard');
    setCurrentPerson(null);
  };

  const handleViewPerson = (id, origin) => {
    setSelectedPersonId(id);
    setPersonDetailOrigin(origin || activeScreen);
    setActiveScreen('screenPersonDetail');
    setIsPeopleModalOpen(false);
  };

  if (!session) return <Login />;

  // Un único Dashboard (antes estaba copiado 4 veces con las mismas 9 props)
  const renderDashboard = () => (
    <Dashboard
      profile={profile}
      areas={areas}
      currentPerson={currentPerson}
      setCurrentPerson={setCurrentPerson}
      lastCaseId={lastCaseId}
      setLastCaseId={setLastCaseId}
      onViewPerson={handleViewPerson}
      prestacionesVersion={prestacionesVersion}
      onOpenSelector={(caseId) => { setSelectorCaseId(caseId || lastCaseId); setEditRecord(null); setIsSelectorOpen(true); }}
      onEditPrestacion={(rec) => { setSelectorCaseId(rec.caseId || lastCaseId); setEditRecord(rec); setIsSelectorOpen(true); }}
    />
  );

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar
        profile={profile}
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onOpenPeople={() => setIsPeopleModalOpen(true)}
        onLogout={handleLogout}
        // Props de notificaciones
        unreadCount={unreadCount}
        notifications={notifications}
        onMarkAllRead={markAllRead}
        onClearNotification={clearNotification}
      />

      <main className="flex-1 min-w-0 flex flex-col items-center">
        <div className="w-full max-w-300 p-4 md:p-8">
          <TopBar
            activeScreen={activeScreen}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onLogout={handleLogout}
            unreadCount={unreadCount}
          />

          <div className="mt-4 md:mt-8">
            {activeScreen === 'screenDashboard' && (
              profile?.role === 'operator'
                ? (
                  <div className="card text-center py-20">
                    <p className="text-4xl mb-4">🔒</p>
                    <p className="text-white font-black uppercase tracking-widest text-sm">
                      Acceso restringido
                    </p>
                    <p className="text-muted text-xs mt-2">
                      Tu rol de operator no tiene acceso a esta sección.
                    </p>
                  </div>
                )
                : renderDashboard()
            )}
            {activeScreen === 'screenCases' && (
              <CasesList areas={areas} profile={profile} onViewPerson={handleViewPerson} />
            )}
            {activeScreen === 'screenStats' && <StatsDashboard areas={areas} />}
            {activeScreen === 'screenSearch' && <GlobalSearch onViewPerson={handleViewPerson} />}

            {activeScreen === 'screenMesaEntrada' && (
              (isSuperAdmin || isMesaEntrada)
                ? <MesaEntrada profile={profile} />
                : renderDashboard()
            )}

            {activeScreen === 'screenDashboardIntendencia' && (
              (isSuperAdmin || isIntendencia)
                ? <DashboardIntendencia profile={profile} onViewPerson={handleViewPerson} />
                : renderDashboard()
            )}

            {activeScreen === 'screenDashboardArea' && (
              (isSuperAdmin || isArea)
                ? <DashboardArea profile={profile} onViewPerson={handleViewPerson} />
                : renderDashboard()
            )}

            {activeScreen === 'screenDashboardFarmacia' && (
              (isSuperAdmin || isFarmacia)
                ? <DashboardFarmacia profile={profile} />
                : renderDashboard()
            )}

            {activeScreen === 'screenPersonDetail' && (
              <PersonDetail
                personId={selectedPersonId}
                profile={profile}
                backLabel={
                  personDetailOrigin === 'screenDashboardIntendencia'
                    ? 'Volver a Personas para Atención'
                    : personDetailOrigin === 'screenDashboardArea'
                    ? 'Volver a mi Bandeja'
                    : 'Volver al Dashboard'
                }
                onBack={() => setActiveScreen(personDetailOrigin || 'screenDashboard')}
                onUsePerson={(p) => { setCurrentPerson(p); setActiveScreen('screenDashboard'); }}
                onViewPerson={handleViewPerson}
              />
            )}
          </div>
        </div>
      </main>

      {isAdminModalOpen && (
        <AdminModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          areas={areas}
          onRefreshAreas={loadAreas}
        />
      )}
      {isPeopleModalOpen && (
        <PeopleModal
          isOpen={isPeopleModalOpen}
          onClose={() => setIsPeopleModalOpen(false)}
          onViewPerson={handleViewPerson}
          profile={profile}
        />
      )}
      {isSelectorOpen && (
        <SelectorPrestacionesModal
          isOpen={isSelectorOpen}
          onClose={() => { setIsSelectorOpen(false); setSelectorCaseId(null); setEditRecord(null); setPrestacionesVersion(v => v + 1); }}
          caseId={selectorCaseId || lastCaseId}
          editRecord={editRecord}
        />
      )}
    </div>
  );
}

export default App;
