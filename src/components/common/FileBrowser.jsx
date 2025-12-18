import { useState } from 'preact/hooks';

export function FileBrowser({ items = [], sort, onClick, onDoubleClick }) {
  const [clickTimer, setClickTimer] = useState(null);

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
      // This might be a single click, wait to see if another click follows
      const timer = setTimeout(() => {
        setClickTimer(null);
        if (onClick) {
          onClick(item, event);
        }
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

  return (
    <div class="bg-white border border-gray-200 rounded-md shadow-sm">
      <div class="divide-y divide-gray-100">
        {sortedItems.map((item, index) => (
          <div
            key={index}
            onClick={(e) => handleClick(item, e)}
            class="flex items-center px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer select-none"
          >
            <span class="flex items-center text-gray-500 mr-2">
              {item.type === 'directory' ? <DirectoryIcon /> : <FileIcon />}
            </span>
            <span class="flex-1 truncate flex items-center">
              {item.name}
              {item.isSymlink && (
                <span class="text-blue-500 opacity-60">
                  <SymlinkIcon />
                </span>
              )}
            </span>
          </div>
        ))}
        {sortedItems.length === 0 && (
          <div class="px-3 py-2 text-sm text-gray-400 text-center">
            No items
          </div>
        )}
      </div>
    </div>
  );
}
