import React, { useState, useEffect } from 'react';
import { 
  X, 
  LayoutGrid, 
  Home, 
  Heart, 
  Truck, 
  Ticket, 
  Fuel, 
  DollarSign, 
  Pill,
  ChevronRight
} from 'lucide-react';

import ModulosForm from './forms/ModulosForm';
import TechoForm from './forms/TechoForm';
import FunebreForm from './forms/FunebreForm';
import ViajesForm from './forms/ViajesForm';
import PasajesForm from './forms/PasajesForm';
import CombustibleForm from './forms/CombustibleForm';
import EconomicoForm from './forms/EconomicoForm';
import MedicamentosForm from './forms/MedicamentosForm';

// editRecord: { formType, data, recordId, tabla, nombre } — si viene, vamos directo al form en modo edición
const SelectorPrestacionesModal = ({ isOpen, onClose, caseId, editRecord }) => {
  const [activeForm, setActiveForm] = useState(null);

  // Cuando se abre: si hay editRecord, ir directo al form; si no, mostrar selector
  useEffect(() => {
    if (!isOpen) {
      setActiveForm(null);
    } else if (editRecord?.formType) {
      setActiveForm(editRecord.formType);
    }
  }, [isOpen, editRecord]);

  if (!isOpen) return null;

  const categories = [
    {
      title: "Acción Social",
      items: [
        { id: 'modulos', label: 'Módulos Alimenticios', icon: LayoutGrid, color: 'text-blue-400' },
        { id: 'techo', label: 'Construyendo Techo', icon: Home, color: 'text-emerald-400' },
        { id: 'funebre', label: 'Servicio Fúnebre', icon: Heart, color: 'text-purple-400' },
        { id: 'viajes', label: 'Viajes de Acción Social', icon: Truck, color: 'text-orange-400' },
      ]
    },
    {
      title: "CIC",
      items: [
        { id: 'pasajes', label: 'Pasajes de Ómnibus', icon: Ticket, color: 'text-pink-400' },
        { id: 'combustible', label: 'Carga de Combustible', icon: Fuel, color: 'text-yellow-400' },
        { id: 'economico', label: 'Ayuda Económica', icon: DollarSign, color: 'text-green-400' },
        { id: 'medicamentos', label: 'Ayuda Medicamentos', icon: Pill, color: 'text-red-400' },
      ]
    }
  ];

  const renderForm = () => {
    // En modo edición pasamos initialData y recordId; en modo nuevo, solo caseId
    const isEditing = !!(editRecord && editRecord.formType === activeForm);
    const props = {
      caseId,
      onBack: () => {
        // Si estamos editando, volver atrás cierra el modal (no hay selector que volver)
        isEditing ? onClose() : setActiveForm(null);
      },
      onClose,
      initialData: isEditing ? editRecord.data : null,
      recordId: isEditing ? editRecord.recordId : null,
      isEditing,
    };

    switch (activeForm) {
      case 'modulos':      return <ModulosForm      {...props} />;
      case 'techo':        return <TechoForm         {...props} />;
      case 'funebre':      return <FunebreForm       {...props} />;
      case 'viajes':       return <ViajesForm        {...props} />;
      case 'pasajes':      return <PasajesForm       {...props} />;
      case 'combustible':  return <CombustibleForm   {...props} />;
      case 'economico':    return <EconomicoForm     {...props} />;
      case 'medicamentos': return <MedicamentosForm  {...props} />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-5000 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[40px] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.5)] flex flex-col relative">
        
        {!activeForm ? (
          <>
            {/* Selector principal */}
            <div className="p-10 border-b border-white/5 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-white">Selector de Prestaciones</h2>
                <p className="text-[10px] uppercase font-bold text-accent tracking-[0.3em] mt-2">Gestión de recursos municipales</p>
              </div>
              <button onClick={onClose} className="bg-white/5 hover:bg-white/10 p-4 rounded-3xl transition-all active:scale-90">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar" style={{ minHeight: 0 }}>
              <div className="space-y-12">
                {categories.map((cat, idx) => (
                  <div key={idx} className="space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/30 ml-2">{cat.title}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {cat.items.map(item => (
                        <button
                          key={item.id}
                          onClick={() => setActiveForm(item.id)}
                          className="group bg-white/3 hover:bg-white/8 border border-white/5 hover:border-white/20 p-6 rounded-4xl flex items-center gap-6 transition-all duration-300 text-left active:scale-[0.98]"
                        >
                          <div className={`p-4 rounded-2xl bg-white/5 group-hover:bg-white/10 transition-colors ${item.color}`}>
                            <item.icon className="w-8 h-8" />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-white text-lg group-hover:translate-x-1 transition-transform">{item.label}</p>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Nuevo formulario</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/60 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {renderForm()}
          </div>
        )}

      </div>
    </div>
  );
};

export default SelectorPrestacionesModal;