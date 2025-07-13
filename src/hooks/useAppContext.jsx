import { useContext } from 'preact/hooks';
import { AppContext } from '../context/AppContext';

export function useAppContext() {
  const context = useContext(AppContext);
  
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  
  return context;
}