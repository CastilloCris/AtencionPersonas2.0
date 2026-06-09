import React from 'react';
import NewCaseForm from './NewCaseForm';
import FamilyGroupSection from './FamilyGroupSection';
import PrestacionesSection from './PrestacionesSection';

const Dashboard = ({ profile, areas, currentPerson, setCurrentPerson, lastCaseId, setLastCaseId, onViewPerson, onOpenSelector, onEditPrestacion }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid lg:grid-cols-1 gap-8">
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

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <FamilyGroupSection currentPerson={currentPerson} />
        <PrestacionesSection 
          lastCaseId={lastCaseId} 
          onOpenSelector={onOpenSelector}
          onEditPrestacion={onEditPrestacion}
        />
      </div>
    </div>
  );
};

export default Dashboard;