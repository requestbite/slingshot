import { useState } from 'preact/hooks';

export function FileBrowser({ items = [], sort, onClick, onDoubleClick, allowedExtensions = null, selectedItem = null, maxItems = 10 }) {
  const [clickTimer, setClickTimer] = useState(null);

  // Check if a file is allowed based on extensions
  const isFileAllowed = (item) => {
    // Directories and parent dir (..) are always allowed
    if (item.type === 'directory' || item.name === '..') {
      return true;
    }

    // If no allowedExtensions specified, all files are allowed
    if (!allowedExtensions || allowedExtensions.length === 0) {
      return true;
    }

    // Check if file has an allowed extension
    const fileName = item.name.toLowerCase();
    return allowedExtensions.some(ext => fileName.endsWith(ext.toLowerCase()));
  };

  // Check if an item is currently selected
  const isSelected = (item) => {
    return selectedItem && selectedItem.name === item.name && selectedItem.type === item.type;
  };

  // Group and sort items
  const sortedItems = (() => {
    // Separate items into groups
    const parentDir = items.filter(item => item.name === '..');
    const directories = items.filter(item => item.type === 'directory' && item.name !== '..');
    const files = items.filter(item => item.type === 'file');

    // Sort each group if alphabetical sorting is requested
    if (sort === 'alphabetical') {
      directories.sort((a, b) => a.name.localeCompare(b.name));
      files.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Combine: parent dir first, then directories, then files
    return [...parentDir, ...directories, ...files];
  })();

  const handleClick = (item, event) => {
    // Handle double-click detection
    if (clickTimer) {
      // This is a double-click
      clearTimeout(clickTimer);
      setClickTimer(null);
      if (onDoubleClick) {
        onDoubleClick(item, event);
      }
    } else {
      // Call onClick immediately for instant visual feedback
      if (onClick) {
        onClick(item, event);
      }

      // Set timer to detect if this becomes a double-click
      const timer = setTimeout(() => {
        setClickTimer(null);
      }, 250);
      setClickTimer(timer);
    }
  };

  const DirectoryIcon = () => (
    <svg
      class="w-4 h-4"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
  );

  const FileIcon = () => (
    <svg
      class="w-4 h-4"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
        clipRule="evenodd"
      />
    </svg>
  );

  const SymlinkIcon = () => (
    <svg
      class="w-3 h-3 ml-1"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
        clipRule="evenodd"
      />
    </svg>
  );

  // Calculate max height based on number of items (each item is ~2rem tall)
  const maxHeight = `${maxItems * 2}rem`;

  return (
    <div
      class="bg-white outline outline-1 -outline-offset-1 outline-gray-300 rounded-md overflow-y-auto scrollbar-hide"
      style={{ maxHeight }}
    >
      <div class="divide-y divide-gray-100">
        {sortedItems.map((item, index) => {
          const allowed = isFileAllowed(item);
          const selected = isSelected(item);
          const isFirst = index === 0;
          const isLast = index === sortedItems.length - 1;

          // Build dynamic classes with rounded corners for first/last items
          const itemClasses = [
            'flex items-center px-3 py-1 text-sm select-none',
            selected ? 'bg-sky-500 text-white' : 'text-gray-700 hover:bg-gray-50',
            allowed ? 'cursor-pointer' : 'cursor-arrow opacity-50',
            selected && isFirst ? 'rounded-t-md' : '',
            selected && isLast ? 'rounded-b-md' : ''
          ].join(' ');

          const iconClasses = selected ? 'text-white' : 'text-gray-500';

          return (
            <div
              key={index}
              onClick={(e) => {
                if (allowed) {
                  handleClick(item, e);
                }
              }}
              class={itemClasses}
            >
              <span class={`flex items-center ${iconClasses} mr-2`}>
                {item.type === 'directory' ? <DirectoryIcon /> : <FileIcon />}
              </span>
              <span class="flex-1 truncate flex items-center">
                {item.name}
                {item.sizeHuman && (
                  <span class={`ml-2 text-xs ${selected ? 'text-sky-100' : 'text-gray-400'}`}>
                    ({item.sizeHuman})
                  </span>
                )}
                {item.isSymlink && (
                  <span class={selected ? 'text-sky-100' : 'text-blue-500 opacity-60'}>
                    <SymlinkIcon />
                  </span>
                )}
              </span>
            </div>
          );
        })}
        {sortedItems.length === 0 && (
          <div class="px-3 py-2 text-sm text-gray-400 text-center">
            No items
          </div>
        )}
      </div>
    </div>
  );
}
