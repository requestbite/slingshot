import { useState, useRef } from 'preact/hooks';
import { ContextMenu } from '../common/ContextMenu';
import { RequestItem } from './RequestItem';
import { RenameFolderModal } from '../modals/RenameFolderModal';
import { DeleteFolderModal } from '../modals/DeleteFolderModal';
import { useAppContext } from '../../hooks/useAppContext';

export function FolderItem({ folder, requests = [], subfolders = [], selectedRequestId, level = 0, onFolderUpdate }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { loadCollections } = useAppContext();
  const menuTriggerRef = useRef();

  const handleContextMenuClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
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
        console.log('Add subfolder to:', folder.name);
        // TODO: Implement add subfolder functionality
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
        class="group flex items-center justify-between px-2 py-1.5 text-sm cursor-pointer rounded transition-colors text-gray-700 hover:bg-gray-100"
        style={{ marginLeft: `${marginLeft}rem` }}
        onClick={toggleExpanded}
      >
        <div class="flex items-center min-w-0 flex-1">
          {/* Expand/Collapse Arrow */}
          {hasChildren && (
            <button
              class="w-4 h-4 mr-1 flex items-center justify-center text-gray-400 hover:text-gray-600"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded();
              }}
            >
              <svg 
                class={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          
          {/* Folder Icon */}
          <svg class="w-3.5 h-3.5 mr-1 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          
          {/* Folder Name */}
          <span class="truncate font-medium">
            {folder.name}
          </span>
        </div>

        {/* Context Menu Trigger */}
        <button
          ref={menuTriggerRef}
          onClick={handleContextMenuClick}
          class="opacity-0 group-hover:opacity-100 p-1 text-sky-400 hover:text-sky-700 transition-all focus:opacity-100 focus:outline focus:-outline-offset-2 focus:outline-sky-500"
          title="More options"
        >
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>

      {/* Children (Subfolders and Requests) */}
      {isExpanded && hasChildren && (
        <ul class="space-y-0">
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
    </li>
  );
}