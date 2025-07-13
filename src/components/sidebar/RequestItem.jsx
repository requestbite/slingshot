import { useState, useRef } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { ContextMenu } from '../common/ContextMenu';
import { getMethodColor } from '../../utils/httpMethods';
import { useAppContext } from '../../hooks/useAppContext';

export function RequestItem({ request, isSelected, level = 0 }) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [, setLocation] = useLocation();
  const { selectedCollection, selectRequest } = useAppContext();
  const menuTriggerRef = useRef();

  const handleRequestClick = () => {
    if (selectedCollection && request) {
      selectRequest(request);
      setLocation(`/${selectedCollection.id}/${request.id}`);
    }
  };

  const handleContextMenuClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu(true);
  };

  const contextMenuItems = [
    {
      label: 'Rename/Move',
      onClick: () => {
        console.log('Rename/Move request:', request.name);
        // TODO: Implement rename/move functionality
      },
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      label: 'Duplicate',
      onClick: () => {
        console.log('Duplicate request:', request.name);
        // TODO: Implement duplicate functionality
      },
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      label: 'Delete',
      onClick: () => {
        console.log('Delete request:', request.name);
        // TODO: Implement delete functionality
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
        class={`group flex items-center justify-between px-2 py-1.5 text-sm cursor-pointer rounded transition-colors ${
          isSelected 
            ? 'bg-sky-50 text-sky-900' 
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        style={{ marginLeft: `${marginLeft}rem` }}
        onClick={handleRequestClick}
      >
        <div class="flex items-center min-w-0 flex-1">
          {/* HTTP Method Badge */}
          <span class={`text-[10px]/[12px] text-white py-0.5 px-1 rounded mr-2 flex-shrink-0 font-medium ${methodColor}`}>
            {request.method}
          </span>
          
          {/* Request Name */}
          <span class="truncate">
            {request.name || request.url || 'Untitled Request'}
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

      {/* Context Menu */}
      <ContextMenu
        isOpen={showContextMenu}
        onClose={() => setShowContextMenu(false)}
        trigger={menuTriggerRef.current}
        items={contextMenuItems}
      />
    </li>
  );
}