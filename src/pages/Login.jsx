import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      
      navigate('/')
    } catch (error) {
      setMessage(error.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-slate-950 overflow-hidden font-sans">
      {/* Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 lg:gap-24">
        
        {/* Left Column - Information */}
        <div className="w-full md:w-1/2 space-y-6 text-center md:text-left hidden md:block">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 shadow-xl mb-6">
            <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-4xl lg:text-5xl xl:text-6xl font-black text-transparent bg-clip-text bg-linear-to-r from-white to-white/70 leading-tight">
            Sistema de control y atención de personas
          </h1>
          <p className="text-lg lg:text-xl text-slate-400 font-medium max-w-lg">
            Gestión integral de casos, asistencia social y seguimiento ciudadano para la municipalidad.
          </p>
        </div>

        {/* Right Column - Login Card */}
        <div className="w-full md:w-1/2 max-w-md mx-auto">
          {/* Mobile Header (visible only on mobile) */}
          <div className="md:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 shadow-xl mb-4">
              <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-white">Atención de Personas</h1>
          </div>

          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-8 lg:p-10 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">Bienvenido</h2>
            <p className="text-slate-400 text-sm mb-8">Ingresa tus credenciales para acceder al sistema.</p>
            
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Correo Electrónico</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-white placeholder-slate-500 transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-white placeholder-slate-500 transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <button
                disabled={loading}
                className="w-full mt-6 py-3.5 px-4 bg-linear-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none uppercase tracking-wide text-sm"
                type="submit"
              >
                {loading ? 'Verificando...' : 'Ingresar'}
              </button>
            </form>

            {message && (
              <div className={`mt-6 p-4 rounded-xl border text-sm flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 ${message.includes('Error') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'}`}>
                {message.includes('Error') ? (
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                ) : (
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                )}
                <span>{message}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
