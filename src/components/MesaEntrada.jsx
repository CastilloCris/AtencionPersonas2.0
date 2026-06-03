import { useState } from 'react';
import { supabase } from '../lib/supabase';

const sanitizeDni = (value) => String(value || '').replace(/\D/g, '');

const savePerson = async ({ dni, apellidoNombre }) => {
  const { data, error } = await supabase
    .from('persons')
    .upsert({ dni, apellido_nombre: apellidoNombre.trim(), updated_at: new Date().toISOString() }, { onConflict: 'dni' })
    .select('id')
    .single();
  return { data, error };
};

const saveAudiencia = async ({ personId, motivo, areaId }) => {
  const { data, error } = await supabase
    .from('audiencias')
    .insert([{ person_id: personId, motivo, estado: 'PENDIENTE', area_id: areaId }])
    .select('id')
    .maybeSingle();
  if (error) console.error('DETALLE DEL ERROR:', error.message);
  return { data, error };
};

export default function MesaEntrada({ profile }) {
  const [dni, setDni] = useState('');
  const [apellidoNombre, setApellidoNombre] = useState('');
  const [motivo, setMotivo] = useState('');
  const [personId, setPersonId] = useState(null);
  const [personExists, setPersonExists] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const isSuperAdmin = profile?.role === 'superadmin';
  const areaId = profile?.areas?.id ?? null;

  const handleDniBlur = async () => {
    const dniNorm = sanitizeDni(dni);
    if (!dniNorm || dniNorm.length < 7) return;
    setLoadingLookup(true);
    setStatus('Buscando ciudadano...');
    setStatusType('info');

    const { data, error } = await supabase
      .from('persons')
      .select('id, dni, apellido_nombre')
      .eq('dni', dniNorm)
      .maybeSingle();

    if (error) {
      setStatus(`Error: ${error.message}`);
      setStatusType('error');
    } else if (data) {
      setPersonId(data.id);
      setPersonExists(true);
      setApellidoNombre(data.apellido_nombre || '');
      setStatus('Ciudadano encontrado en el sistema.');
      setStatusType('success');
    } else {
      setPersonId(null);
      setPersonExists(false);
      setStatus('DNI no registrado. Complete los datos.');
      setStatusType('warn');
    }
    setLoadingLookup(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile) { setStatus('Espere a que cargue el perfil del usuario.'); setStatusType('warn'); return; }
    if (!isSuperAdmin && !areaId) { setStatus('Error: el usuario no tiene un área asignada.'); setStatusType('error'); return; }
    if (!dni || !apellidoNombre || !motivo) { setStatus('Por favor complete todos los campos.'); setStatusType('warn'); return; }

    setLoadingSave(true);
    setStatus('Guardando...');
    setStatusType('info');

    try {
      let finalPersonId = personId;
      if (!personExists) {
        const { data, error } = await savePerson({ dni, apellidoNombre });
        if (error) throw error;
        finalPersonId = data.id;
      }
      const { error: audError } = await saveAudiencia({ personId: finalPersonId, motivo, areaId });
      if (audError) throw audError;

      setStatus('Solicitud de audiencia registrada con éxito.');
      setStatusType('success');
      setDni('');
      setApellidoNombre('');
      setMotivo('');
      setPersonExists(false);
      setPersonId(null);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
      setStatusType('error');
    } finally {
      setLoadingSave(false);
    }
  };

  const statusColors = {
    error:   'bg-red-500/8 border-red-500/20 text-red-400',
    success: 'bg-teal-500/8 border-teal-500/20 text-teal-400',
    warn:    'bg-amber-500/8 border-amber-500/20 text-amber-400',
    info:    'bg-accent2/8 border-accent/20 text-accent',
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-accent2/15 border border-accent/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Mesa de Entrada</h2>
              <p className="text-[10px] text-muted tracking-wider">{profile?.areas?.name || 'Área General'}</p>
            </div>
          </div>
          <p className="text-sm text-muted mt-3">Registrá una nueva solicitud de audiencia completando los datos del ciudadano.</p>
        </div>

        {/* Form card */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label>DNI del ciudadano</label>
                <input
                  type="text"
                  placeholder="Sin puntos ni espacios"
                  value={dni}
                  onChange={e => setDni(sanitizeDni(e.target.value))}
                  onBlur={handleDniBlur}
                  required
                />
              </div>
              <div>
                <label>Apellido y nombre</label>
                <input
                  type="text"
                  placeholder="Apellido, Nombre"
                  value={apellidoNombre}
                  onChange={e => setApellidoNombre(e.target.value)}
                  disabled={personExists}
                  className="disabled:opacity-40"
                  required
                />
              </div>
            </div>

            <div>
              <label>Motivo de la audiencia</label>
              <textarea
                placeholder="Describa el motivo de la solicitud..."
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                rows="4"
                className="resize-none"
                required
              />
            </div>

            {status && (
              <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${statusColors[statusType] || statusColors.info}`}>
                {statusType === 'success' && <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                {statusType === 'error' && <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                <span>{status}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loadingSave || loadingLookup}
              className="primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loadingSave ? 'Procesando...' : 'Registrar solicitud de audiencia'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
