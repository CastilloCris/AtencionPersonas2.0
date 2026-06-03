import React from 'react';

const PrestacionModal = ({ isOpen, onClose, prestacion, onSave }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-[3px] z-1210 flex items-center justify-center p-4">
      <div className="prestacion-modal-box bg-(--card) w-full max-w-[920px] max-h-[88vh] overflow-auto rounded-[18px] border border-(--border) p-5 shadow-2xl">
        <div className="prestacionModalHead flex items-center justify-between gap-2 mb-4">
          <h2 className="m-0 text-xl font-bold">Cargar Prestación</h2>
          <button className="danger" onClick={onClose}>Cerrar</button>
        </div>
        
        <div className="modalCard border border-(--border) rounded-[14px] p-4 bg-(--panel)">
          <p className="muted">Aquí se cargará el formulario dinámico de la prestación seleccionada.</p>
          <div className="mt-4 flex gap-2">
            <button className="primary">Guardar Prestación</button>
            <button className="secondary" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrestacionModal;
