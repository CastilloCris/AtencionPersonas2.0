import React from 'react';
import NewCaseForm from './NewCaseForm';
import FamilyGroupSection from './FamilyGroupSection';
import PrestacionesSection from './PrestacionesSection';

const Dashboard = ({ profile, areas, currentPerson, setCurrentPerson, lastCaseId, setLastCaseId, onViewPerson, onOpenSelector }) => {
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
        {/* PrestacionesSection llama onOpenSelector(caseId) — App.jsx debe recibirlo */}
        <PrestacionesSection 
          lastCaseId={lastCaseId} 
          onOpenSelector={onOpenSelector}
        />
      </div>
    </div>
  );
};

export default Dashboard;