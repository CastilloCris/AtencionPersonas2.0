import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setStatus('Iniciando sesión...');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus('Error: ' + error.message);
    } else {
      setStatus('Acceso concedido');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg overflow-hidden relative">
      {/* Subtle glow blobs */}
      <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-accent2/10 blur-[140px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[40%] h-[40%] bg-indigo-800/10 blur-[140px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-16">

        {/* Left — info */}
        <div className="hidden md:flex flex-col w-1/2 space-y-6">
          <img
            src="/escudo.png"
            alt="Escudo Municipalidad de Colonia Wanda"
            className="w-20 h-20 object-contain drop-shadow-lg"
          />
          <h1 className="text-4xl font-bold text-white leading-tight">
            Municipalidad de Wanda
          </h1>
          <p className="text-muted text-base leading-relaxed max-w-sm">
            Gestión <span className="text-white font-semibold">Romina Faccio</span>
            <br />
            <span className="text-xs uppercase tracking-widest text-muted/70">
              Intendente · Municipalidad de Colonia Wanda
            </span>
          </p>
          <div className="pt-4">
            <img
              src="/header_institucional.png"
              alt="Misiones — CIC Wanda — Romina Faccio Intendente"
              className="w-full max-w-sm rounded-xl object-contain opacity-90"
            />
          </div>
        </div>

        {/* Right — form */}
        <div className="w-full md:w-1/2 max-w-sm mx-auto">
          <div className="bg-panel border border-white/8 rounded-2xl p-8">
            <div className="mb-7">
              <h2 className="text-xl font-semibold text-white mb-1">Bienvenido</h2>
              <p className="text-muted text-sm">Ingresá tus credenciales para acceder.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label>Correo electrónico</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label>Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="primary w-full py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verificando...' : 'Ingresar al sistema'}
              </button>
            </form>

            {status && (
              <div className={`mt-5 p-3.5 rounded-xl border text-sm flex items-center gap-2.5 ${status.includes('Error') ? 'bg-red-500/8 border-red-500/20 text-red-400' : 'bg-accent2/8 border-accent/20 text-accent'}`}>
                {status.includes('Error')
                  ? <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  : <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                }
                <span>{status}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
