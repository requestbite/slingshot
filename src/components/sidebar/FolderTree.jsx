import { useState, useEffect } from 'preact/hooks';
import { FolderItem } from './FolderItem';
import { RequestItem } from './RequestItem';
import { useAppContext } from '../../hooks/useAppContext';
import { apiClient } from '../../api';

export function FolderTree({ searchTerm = '' }) {
  const { selectedCollection, selectedRequest } = useAppContext();
  const [treeData, setTreeData] = useState({ folders: [], requests: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [filteredData, setFilteredData] = useState({ folders: [], requests: [] });

  useEffect(() => {
    if (selectedCollection) {
      loadTreeData();
    } else {
      setTreeData({ folders: [], requests: [] });
      setFilteredData({ folders: [], requests: [] });
    }
  }, [selectedCollection]);

  useEffect(() => {
    filterTreeData();
  }, [searchTerm, treeData]);

  const loadTreeData = async () => {
    if (!selectedCollection) return;

    try {
      setIsLoading(true);
      
      // Load folders and requests for the selected collection
      const [folders, requests] = await Promise.all([
        apiClient.getFoldersByCollection(selectedCollection.id),
        apiClient.getRequestsByCollection(selectedCollection.id)
      ]);

      // Build hierarchical tree structure
      const tree = buildTreeStructure(folders, requests);
      setTreeData(tree);
      
    } catch (error) {
      console.error('Failed to load tree data:', error);
      setTreeData({ folders: [], requests: [] });
    } finally {
      setIsLoading(false);
    }
  };

  const buildTreeStructure = (folders, requests) => {
    // Create lookup maps
    const folderMap = new Map();
    const requestsByFolder = new Map();
    
    // Initialize folder map
    folders.forEach(folder => {
      folderMap.set(folder.id, {
        ...folder,
        subfolders: [],
        requests: []
      });
    });

    // Group requests by folder
    requests.forEach(request => {
      const folderId = request.folder_id;
      if (folderId) {
        if (!requestsByFolder.has(folderId)) {
          requestsByFolder.set(folderId, []);
        }
        requestsByFolder.get(folderId).push(request);
      }
    });

    // Assign requests to folders
    requestsByFolder.forEach((folderRequests, folderId) => {
      const folder = folderMap.get(folderId);
      if (folder) {
        folder.requests = folderRequests;
      }
    });

    // Build hierarchy (folders with subfolders)
    const rootFolders = [];
    const rootRequests = [];

    folders.forEach(folder => {
      const folderWithData = folderMap.get(folder.id);
      
      if (folder.parent_folder_id) {
        // This is a subfolder
        const parentFolder = folderMap.get(folder.parent_folder_id);
        if (parentFolder) {
          parentFolder.subfolders.push(folderWithData);
        }
      } else {
        // This is a root folder
        rootFolders.push(folderWithData);
      }
    });

    // Add requests that don't belong to any folder
    requests.forEach(request => {
      if (!request.folder_id) {
        rootRequests.push(request);
      }
    });

    return {
      folders: rootFolders,
      requests: rootRequests
    };
  };

  const handleTreeUpdate = async () => {
    // Reload the tree data when an item is updated
    await loadTreeData();
  };

  const filterTreeData = () => {
    if (!searchTerm.trim()) {
      setFilteredData(treeData);
      return;
    }

    const term = searchTerm.toLowerCase();
    
    // Filter folders and requests recursively
    const filterFolder = (folder) => {
      const folderMatches = folder.name.toLowerCase().includes(term);
      const filteredSubfolders = folder.subfolders
        .map(filterFolder)
        .filter(Boolean);
      const filteredRequests = folder.requests.filter(request =>
        request.name.toLowerCase().includes(term) ||
        request.method.toLowerCase().includes(term) ||
        request.url.toLowerCase().includes(term)
      );

      // Include folder if it matches or has matching children
      if (folderMatches || filteredSubfolders.length > 0 || filteredRequests.length > 0) {
        return {
          ...folder,
          subfolders: filteredSubfolders,
          requests: filteredRequests
        };
      }

      return null;
    };

    const filteredFolders = treeData.folders
      .map(filterFolder)
      .filter(Boolean);

    const filteredRequests = treeData.requests.filter(request =>
      request.name.toLowerCase().includes(term) ||
      request.method.toLowerCase().includes(term) ||
      request.url.toLowerCase().includes(term)
    );

    setFilteredData({
      folders: filteredFolders,
      requests: filteredRequests
    });
  };

  if (!selectedCollection) {
    return null;
  }

  if (isLoading) {
    return (
      <div class="flex items-center justify-center py-8">
        <div class="flex items-center space-x-2 text-gray-500">
          <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span class="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  const hasContent = filteredData.folders.length > 0 || filteredData.requests.length > 0;
  const hasSearchTerm = searchTerm.trim().length > 0;

  if (!hasContent) {
    return (
      <div class="text-center py-6 text-gray-500">
        {hasSearchTerm ? (
          <>
            <svg class="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p class="text-xs">No matches found</p>
          </>
        ) : (
          <>
            <svg class="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p class="text-xs">No requests yet</p>
            <p class="text-xs mt-1 text-gray-400">Import an OpenAPI spec or add folders</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div class="mt-2">
      <ul class="space-y-1">
        {/* Render root folders */}
        {filteredData.folders.map(folder => (
          <FolderItem
            key={folder.id}
            folder={folder}
            requests={folder.requests}
            subfolders={folder.subfolders}
            selectedRequestId={selectedRequest?.id}
            level={0}
            onFolderUpdate={handleTreeUpdate}
          />
        ))}
        
        {/* Render root-level requests (not in any folder) */}
        {filteredData.requests.map(request => (
          <RequestItem
            key={request.id}
            request={request}
            isSelected={request.id === selectedRequest?.id}
            level={0}
            onRequestUpdate={handleTreeUpdate}
          />
        ))}
      </ul>
    </div>
  );
}