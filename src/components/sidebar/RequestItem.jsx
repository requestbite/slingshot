import { useState, useRef, useEffect } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { ContextMenu } from '../common/ContextMenu';
import { RenameRequestModal } from '../modals/RenameRequestModal';
import { DeleteRequestModal } from '../modals/DeleteRequestModal';
import { getMethodColor } from '../../utils/httpMethods';
import { useAppContext } from '../../hooks/useAppContext';
import { apiClient } from '../../api';
import { setLastSlingshotUrl } from '../../utils/slingshotNavigation';

export function RequestItem({ request, isSelected, level = 0, onRequestUpdate }) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [, setLocation] = useLocation();
  const { selectedCollection, selectRequest, loadCollections } = useAppContext();
  const menuTriggerRef = useRef();

  useEffect(() => {
    const handleCloseAllContextMenus = (e) => {
      if (e.detail.exceptId !== request.id) {
        setShowContextMenu(false);
      }
    };

    window.addEventListener('closeAllContextMenus', handleCloseAllContextMenus);
    return () => {
      window.removeEventListener('closeAllContextMenus', handleCloseAllContextMenus);
    };
  }, [request.id]);

  const handleRequestClick = () => {
    if (selectedCollection && request) {
      selectRequest(request);
      const url = `/${selectedCollection.id}/${request.id}`;
      setLastSlingshotUrl(url);
      setLocation(url);
    }
  };

  const handleContextMenuClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Close any other open context menus by dispatching a custom event
    window.dispatchEvent(new CustomEvent('closeAllContextMenus', { detail: { exceptId: request.id } }));

    setShowContextMenu(true);
  };

  const handleRequestUpdate = async (updatedRequest) => {
    // Refresh the collections to update the sidebar
    await loadCollections();
    // Call parent callback if provided
    if (onRequestUpdate) {
      onRequestUpdate(updatedRequest);
    }
  };

  const handleDuplicateRequest = async () => {
    try {
      setShowContextMenu(false);
      const duplicatedRequest = await apiClient.duplicateRequest(request.id);

      // Refresh the sidebar to show the new request
      await loadCollections();

      // Call parent callback if provided
      if (onRequestUpdate) {
        onRequestUpdate(duplicatedRequest);
      }

      console.log('Request duplicated successfully:', duplicatedRequest.name);
    } catch (error) {
      console.error('Failed to duplicate request:', error);
      // TODO: Show error toast/notification to user
    }
  };

  const handleRequestDelete = async (deletedRequest) => {
    // Refresh the collections to update the sidebar
    await loadCollections();
    // Call parent callback if provided
    if (onRequestUpdate) {
      onRequestUpdate(deletedRequest);
    }
  };

  const contextMenuItems = [
    {
      label: 'Rename / Move...',
      onClick: () => {
        setShowContextMenu(false);
        setShowRenameModal(true);
      },
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      label: 'Duplicate',
      onClick: handleDuplicateRequest,
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      divider: true
    },
    {
      label: 'Delete...',
      onClick: () => {
        setShowContextMenu(false);
        setShowDeleteModal(true);
      },
      destructive: true,
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )
    }
  ];

  const methodColor = getMethodColor(request.method);
  const marginLeft = level * 1; // 1rem per level

  return (
    <li class="request relative">
      <div
        class={`flex items-center justify-between relative hover:bg-gray-100 py-1 px-1 rounded ${isSelected ? 'bg-sky-50' : ''
          }`}
        style={{ marginLeft: `${marginLeft * 10}px` }}
      >
        <a
          href={selectedCollection ? `/${selectedCollection.id}/${request.id}/` : '#'}
          class="flex items-center flex-grow overflow-hidden cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            handleRequestClick();
          }}
        >
          <span class={`text-[10px]/[12px] text-white py-0.5 px-1 rounded mr-2 flex-shrink-0 ${methodColor}`}>
            {request.method}
          </span>
          <span class="text-xs truncate">{request.name || request.url || 'Untitled Request'}</span>
        </a>

        {/* Context Menu Trigger */}
        <button
          ref={menuTriggerRef}
          onClick={handleContextMenuClick}
          class="flex items-center text-sky-400 hover:text-sky-700 focus:outline-none cursor-pointer"
          title="More options"
        >
          <span class="sr-only">Open options</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="flex-shrink-0">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </div>

      {/* Context Menu */}
      <ContextMenu
        isOpen={showContextMenu}
        onClose={() => setShowContextMenu(false)}
        trigger={menuTriggerRef.current}
        items={contextMenuItems}
      />

      {/* Rename/Move Modal */}
      <RenameRequestModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        request={request}
        onUpdate={handleRequestUpdate}
      />

      {/* Delete Modal */}
      <DeleteRequestModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        request={request}
        onDelete={handleRequestDelete}
      />
    </li>
  );
}
