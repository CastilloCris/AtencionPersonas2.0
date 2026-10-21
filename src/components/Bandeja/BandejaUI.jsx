import { useEffect, useState } from 'react';
import { PRIORIDAD } from '../../lib/audiencias';
import { haceCuanto } from '../../lib/fechas';

// Piezas compartidas por la bandeja de Intendencia y la de cada Área.
// Diseñadas primero para celular: botones de 44px+, texto de 14px+, una columna.

export function Avatar({ name }) {
  const initials = name
    ? name.trim().split(/[, ]+/).filter(Boolean).slice(0, 2).reverse().map(w => w[0]).join('').toUpperCase()
    : '?';
  return (
    <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center text-accent text-sm font-bold shrink-0">
      {initials}
    </div>
  );
}

export function PrioridadBadge({ prioridad }) {
  const p = PRIORIDAD[prioridad] || PRIORIDAD.normal;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-semibold ${p.badge}`}>
      <span aria-hidden>{p.icono}</span>{p.label}
    </span>
  );
}

/** Motivo completo con "Ver más" (en celular no hay hover para leer lo cortado). */
export function Motivo({ texto }) {
  const [abierto, setAbierto] = useState(false);
  if (!texto) return null;
  const largo = texto.length > 140;
  return (
    <div className="text-sm text-white/75 leading-relaxed">
      <p className={!abierto && largo ? 'line-clamp-3' : ''}>{texto}</p>
      {largo && (
        <button
          type="button"
          onClick={() => setAbierto(v => !v)}
          className="p-0! mt-1 bg-transparent! text-accent text-sm font-semibold"
        >
          {abierto ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </div>
  );
}

/** Selector de prioridad: <select> nativo, en celular abre la ruedita del sistema. */
export function SelectorPrioridad({ value, onChange, disabled }) {
  return (
    <select
      aria-label="Prioridad"
      value={value || 'normal'}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="tap py-2 text-sm cursor-pointer tracking-normal"
    >
      <option value="baja">↓ Baja</option>
      <option value="normal">→ Normal</option>
      <option value="alta">↑ Alta</option>
      <option value="urgente">⚡ Urgente</option>
    </select>
  );
}

/** Encabezado de la tarjeta: persona, DNI, prioridad, área y antigüedad. */
export function CabeceraAudiencia({ a, etiquetaArea }) {
  return (
    <>
      <div className="flex items-start gap-3">
        <Avatar name={a.persona?.apellido_nombre} />
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold text-base leading-tight break-words">
            {a.persona?.apellido_nombre || 'Sin nombre'}
          </p>
          <p className="text-muted text-sm font-mono mt-0.5">DNI {a.persona?.dni || '—'}</p>
        </div>
        <span className="text-xs text-white/50 whitespace-nowrap pt-0.5" title={new Date(a.created_at).toLocaleString('es-AR')}>
          {haceCuanto(a.created_at)}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <PrioridadBadge prioridad={a.prioridad} />
        {etiquetaArea && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md border text-xs bg-white/5 text-white/70 border-white/15">
            {etiquetaArea}
          </span>
        )}
      </div>
    </>
  );
}

/**
 * Hoja inferior en celular (sube desde abajo, al alcance del pulgar)
 * y ventana centrada en escritorio.
 */
export function HojaInferior({ titulo, subtitulo, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // que no se desplace la bandeja de fondo
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflowPrevio;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        className="hoja-entrar w-full md:max-w-md bg-panel border border-white/10 rounded-t-3xl md:rounded-2xl max-h-[88vh] overflow-y-auto pb-seguro"
        onClick={e => e.stopPropagation()}
      >
        <div className="md:hidden flex justify-center pt-2.5">
          <span className="w-10 h-1.5 rounded-full bg-white/20" aria-hidden />
        </div>
        <div className="px-5 pt-3 md:pt-5 pb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-lg leading-tight">{titulo}</h3>
            {subtitulo && <p className="text-muted text-sm mt-0.5">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tap min-w-[44px] p-0! bg-white/5! text-white text-xl"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="px-5 pb-2 space-y-4">{children}</div>
      </div>
    </div>
  );
}

/** Aviso inferior. Con onDeshacer muestra el botón "Deshacer". */
export function Aviso({ aviso, onCerrar }) {
  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(onCerrar, aviso.onDeshacer ? 7000 : 4500);
    return () => clearTimeout(t);
  }, [aviso, onCerrar]);

  if (!aviso) return null;
  const esError = aviso.tipo === 'error';
  return (
    <div className="fixed left-0 right-0 bottom-0 z-[1200] px-4 pb-seguro pointer-events-none">
      <div
        role={esError ? 'alert' : 'status'}
        className={`fade-in pointer-events-auto mx-auto max-w-md flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl
          ${esError ? 'bg-red-950 border-red-500/40 text-red-100' : 'bg-[#1f1f1f] border-white/15 text-white'}`}
      >
        <p className="flex-1 text-sm">{aviso.mensaje}</p>
        {aviso.onDeshacer && (
          <button
            type="button"
            onClick={() => { aviso.onDeshacer(); onCerrar(); }}
            className="tap px-3! py-1! bg-transparent! text-accent font-bold text-sm uppercase tracking-wide"
          >
            Deshacer
          </button>
        )}
      </div>
    </div>
  );
}

/** Encabezado de la bandeja con contadores y botón actualizar. */
export function EncabezadoBandeja({ titulo, subtitulo, total, urgentes, loading, onActualizar }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* En celular el título ya está en la barra superior: no se repite */}
          <h2 className="hidden md:block text-xl font-semibold text-white leading-tight">{titulo}</h2>
          <p className="text-sm text-muted md:mt-1">{subtitulo}</p>
        </div>
        <button
          type="button"
          className="secondary tap shrink-0 px-3! text-sm"
          onClick={onActualizar}
          disabled={loading}
          aria-label="Actualizar bandeja"
        >
          <span className={loading ? 'animate-spin inline-block' : 'inline-block'} aria-hidden>⟳</span>
          <span className="hidden sm:inline">{loading ? 'Actualizando…' : 'Actualizar'}</span>
        </button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm">
          {total} pendiente{total === 1 ? '' : 's'}
        </span>
        {urgentes > 0 && (
          <span className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-semibold">
            ⚡ {urgentes} urgente{urgentes > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

export function BandejaVacia({ titulo, detalle }) {
  return (
    <div className="card text-center py-16">
      <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto mb-4 text-teal-400 text-2xl">
        ✓
      </div>
      <p className="text-white font-medium">{titulo}</p>
      <p className="text-muted text-sm mt-1">{detalle}</p>
    </div>
  );
}

export function ErrorConexion({ mensaje, onReintentar }) {
  if (!mensaje) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-200 text-sm">
      <span className="flex-1">{mensaje}</span>
      <button type="button" onClick={onReintentar} className="secondary tap px-3! text-sm">Reintentar</button>
    </div>
  );
}

/** Error dentro de la hoja, encima del botón (el aviso inferior lo taparía). */
export function ErrorEnHoja({ mensaje }) {
  if (!mensaje) return null;
  return (
    <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
      {mensaje}
    </p>
  );
}
