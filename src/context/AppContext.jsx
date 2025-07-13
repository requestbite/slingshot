import { createContext } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { apiClient } from '../api';

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [currentEnvironment, setCurrentEnvironment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load collections on app start
  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      setIsLoading(true);
      const allCollections = await apiClient.getAllCollections();
      setCollections(allCollections);
    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addCollection = (collection) => {
    setCollections(prev => [...prev, collection]);
  };

  const updateCollection = (updatedCollection) => {
    setCollections(prev => 
      prev.map(col => 
        col.id === updatedCollection.id ? updatedCollection : col
      )
    );
  };

  const removeCollection = (collectionId) => {
    setCollections(prev => prev.filter(col => col.id !== collectionId));
    if (selectedCollection?.id === collectionId) {
      setSelectedCollection(null);
      setSelectedRequest(null);
    }
  };

  const selectCollection = (collection) => {
    setSelectedCollection(collection);
    setSelectedRequest(null); // Clear selected request when changing collection
  };

  const selectRequest = (request) => {
    setSelectedRequest(request);
  };

  const value = {
    // Collections
    collections,
    selectedCollection,
    selectedRequest,
    currentEnvironment,
    isLoading,
    
    // Actions
    loadCollections,
    addCollection,
    updateCollection,
    removeCollection,
    selectCollection,
    selectRequest,
    setCurrentEnvironment
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}