import { useState, useRef, useEffect } from 'preact/hooks';
import { ContextMenu } from '../common/ContextMenu';
import { RequestItem } from './RequestItem';
import { RenameFolderModal } from '../modals/RenameFolderModal';
import { DeleteFolderModal } from '../modals/DeleteFolderModal';
import { AddFolderModal } from '../modals/AddFolderModal';
import { useAppContext } from '../../hooks/useAppContext';

export function FolderItem({ folder, requests = [], subfolders = [], selectedRequestId, level = 0, onFolderUpdate }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddSubfolderModal, setShowAddSubfolderModal] = useState(false);
  const { loadCollections } = useAppContext();
  const menuTriggerRef = useRef();

  useEffect(() => {
    const handleCloseAllContextMenus = (e) => {
      if (e.detail.exceptId !== folder.id) {
        setShowContextMenu(false);
      }
    };

    window.addEventListener('closeAllContextMenus', handleCloseAllContextMenus);
    return () => {
      window.removeEventListener('closeAllContextMenus', handleCloseAllContextMenus);
    };
  }, [folder.id]);

  const handleContextMenuClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Close any other open context menus by dispatching a custom event
    window.dispatchEvent(new CustomEvent('closeAllContextMenus', { detail: { exceptId: folder.id } }));

    setShowContextMenu(true);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleFolderUpdate = async (updatedFolder) => {
    // Refresh the collections to update the sidebar
    await loadCollections();
    // Call parent callback if provided
    if (onFolderUpdate) {
      onFolderUpdate(updatedFolder);
    }
  };

  const handleFolderDelete = async (deletedFolder) => {
    // Refresh the collections to update the sidebar
    await loadCollections();
    // Call parent callback if provided
    if (onFolderUpdate) {
      onFolderUpdate(deletedFolder);
    }
  };

  const contextMenuItems = [
    {
      label: 'Add subfolder',
      onClick: () => {
        setShowContextMenu(false);
        setShowAddSubfolderModal(true);
      },
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      )
    },
    {
      label: 'Rename/Move',
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
      label: 'Delete',
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

  const marginLeft = level * 1; // 1rem per level
  const hasChildren = subfolders.length > 0 || requests.length > 0;

  return (
    <li class="folder">
      <div
        class="flex items-center justify-between text-gray-700 py-1 hover:bg-gray-100 rounded px-1 relative"
        style={{ marginLeft: `${marginLeft * 10}px` }}
      >
        <div class="flex items-center overflow-hidden cursor-pointer" onClick={toggleExpanded}>
          {/* Expand/Collapse Arrow */}
          {hasChildren && (
            <svg
              class={`w-3 h-3 mr-1 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          )}
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1 text-gray-500 flex-shrink-0">
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
          </svg>
          <span class="text-xs truncate">{folder.name}</span>
        </div>

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

      {/* Children (Subfolders and Requests) */}
      {isExpanded && hasChildren && (
        <ul class="ml-4 space-y-0">
          {/* Render subfolders first */}
          {subfolders.map(subfolder => (
            <FolderItem
              key={subfolder.id}
              folder={subfolder}
              requests={subfolder.requests || []}
              subfolders={subfolder.subfolders || []}
              selectedRequestId={selectedRequestId}
              level={level + 1}
              onFolderUpdate={onFolderUpdate}
            />
          ))}

          {/* Render requests */}
          {requests.map(request => (
            <RequestItem
              key={request.id}
              request={request}
              isSelected={request.id === selectedRequestId}
              level={level + 1}
              onRequestUpdate={onFolderUpdate}
            />
          ))}
        </ul>
      )}

      {/* Context Menu */}
      <ContextMenu
        isOpen={showContextMenu}
        onClose={() => setShowContextMenu(false)}
        trigger={menuTriggerRef.current}
        items={contextMenuItems}
      />

      {/* Rename/Move Modal */}
      <RenameFolderModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        folder={folder}
        onUpdate={handleFolderUpdate}
      />

      {/* Delete Modal */}
      <DeleteFolderModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        folder={folder}
        onDelete={handleFolderDelete}
      />

      {/* Add Subfolder Modal */}
      <AddFolderModal
        isOpen={showAddSubfolderModal}
        onClose={() => setShowAddSubfolderModal(false)}
        parentFolder={folder}
        onSuccess={handleFolderUpdate}
      />
    </li>
  );
}
