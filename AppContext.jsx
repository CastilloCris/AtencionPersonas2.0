import React, { createContext } from 'react';
import { useProfile } from '../hooks/useProfile';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const { profile, areas, loading, refetchAreas, logout } = useProfile();

  return (
    <AppContext.Provider value={{ profile, areas, loading, refetchAreas, logout }}>
      {children}
    </AppContext.Provider>
  );
};