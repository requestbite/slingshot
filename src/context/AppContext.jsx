import { createContext } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { apiClient } from '../api';

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [location] = useLocation();
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [currentEnvironment, setCurrentEnvironment] = useState(null);
  const [hasManuallySelectedEnvironment, setHasManuallySelectedEnvironment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load collections on app start
  useEffect(() => {
    loadCollections();
  }, []);

  // Initialize selected collection and request from URL
  useEffect(() => {
    if (collections.length > 0) {
      initializeFromUrl();
    }
  }, [collections, location]);

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

  const initializeFromUrl = async () => {
    const pathSegments = location.split('/').filter(Boolean);
    
    if (pathSegments.length === 0) {
      // Home page - clear selections
      setSelectedCollection(null);
      setSelectedRequest(null);
      return;
    }

    const collectionId = pathSegments[0];
    const requestId = pathSegments[1];

    // Find and set the collection
    const collection = collections.find(col => col.id === collectionId);
    if (collection) {
      setSelectedCollection(collection);
      
      // If there's a request ID, find and set the request
      if (requestId) {
        try {
          const request = await apiClient.getRequest(requestId);
          if (request && request.collection_id === collectionId) {
            setSelectedRequest(request);
          } else {
            setSelectedRequest(null);
          }
        } catch (error) {
          console.error('Failed to load request:', error);
          setSelectedRequest(null);
        }
      } else {
        setSelectedRequest(null);
      }
    } else {
      // Collection not found, clear selections
      setSelectedCollection(null);
      setSelectedRequest(null);
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

  // Force refresh of collection data (useful after adding/editing requests)
  const refreshCollectionData = () => {
    // Trigger a re-render by updating a timestamp or counter
    // This will cause components that depend on selectedCollection to reload their data
    if (selectedCollection) {
      setSelectedCollection({ ...selectedCollection, _refreshTrigger: Date.now() });
    }
  };

  const value = {
    // Collections
    collections,
    selectedCollection,
    selectedRequest,
    currentEnvironment,
    hasManuallySelectedEnvironment,
    isLoading,
    
    // Actions
    loadCollections,
    addCollection,
    updateCollection,
    removeCollection,
    selectCollection,
    selectRequest,
    setCurrentEnvironment,
    setHasManuallySelectedEnvironment,
    refreshCollectionData
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}