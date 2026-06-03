import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Settings, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Personas', path: '/personas', icon: Users },
    { name: 'Casos', path: '/casos', icon: Briefcase },
    { name: 'Administración', path: '/admin', icon: Settings },
  ]

  return (
    <div className="flex min-h-screen bg-brand-bg">
      {/* Sidebar Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-brand-panel/95 backdrop-blur-md border-r border-brand-border transition-transform duration-200 lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6">
          <h1 className="text-xl font-bold text-brand-text">Ficha Social</h1>
          <p className="text-brand-muted text-xs uppercase tracking-widest mt-1">MVP Municipal</p>
        </div>

        <nav className="px-4 space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                ${isActive 
                  ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20' 
                  : 'text-brand-muted hover:bg-white/5 hover:text-brand-text'}
              `}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-6 left-0 w-full px-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-brand-danger hover:bg-brand-danger/10 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* TopBar */}
        <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-brand-panel/80 backdrop-blur-md border-b border-brand-border lg:mx-6 lg:mt-4 lg:rounded-2xl lg:border">
          <div className="flex items-center gap-3">
            <button 
              className="p-2 lg:hidden text-brand-text"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="hidden lg:block">
              <h2 className="text-lg font-bold text-brand-text">Municipalidad</h2>
              <p className="text-brand-muted text-xs">Gestión Centralizada</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="pill-brand">SuperAdmin</div>
            <div className="w-10 h-10 rounded-full bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-accent font-bold">
              AD
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6 max-w-6xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
