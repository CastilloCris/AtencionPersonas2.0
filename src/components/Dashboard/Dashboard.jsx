import React from 'react';
import NewCaseForm from './NewCaseForm';
import FamilyGroupSection from './FamilyGroupSection';
import PrestacionesSection from './PrestacionesSection';

const Dashboard = ({ profile, areas, currentPerson, setCurrentPerson, lastCaseId, setLastCaseId, onViewPerson, onOpenSelector, onEditPrestacion, prestacionesVersion }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 gap-4 md:gap-8">
        <NewCaseForm 
          profile={profile} 
          areas={areas} 
          currentPerson={currentPerson}
          setCurrentPerson={setCurrentPerson}
          lastCaseId={lastCaseId}
          setLastCaseId={setLastCaseId}
          onViewPerson={onViewPerson}
        />
      </div>

      {/* grid-cols-1 explícito: sin él la columna se estiraba a 624px en celular y toda la app se veía achicada */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 items-start">
        <FamilyGroupSection currentPerson={currentPerson} />
        <PrestacionesSection 
          lastCaseId={lastCaseId} 
          prestacionesVersion={prestacionesVersion}
          onOpenSelector={onOpenSelector}
          onEditPrestacion={onEditPrestacion}
        />
      </div>
    </div>
  );
};

export default Dashboard;