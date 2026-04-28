import { useState, useMemo } from 'preact/hooks';
import { getMethodColor } from '../../utils/httpMethods';
import { getOperationsByTag, getEndpointId } from './OpenAPIViewer';

// ---------------------------------------------------------------------------
// Single operation item — mirrors RequestItem without context menu
// ---------------------------------------------------------------------------

function OperationItem({ method, path, operation, isActive, onClick, level = 0 }) {
  const label = operation.summary || path;
  const marginLeft = level * 10;

  return (
    <li class="request relative">
      <div
        class={`flex items-center py-1 px-1 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-dark-200 ${isActive ? 'bg-sky-50 dark:bg-primary-dark-200' : ''}`}
        style={{ marginLeft: `${marginLeft}px` }}
        onClick={onClick}
        title={path}
      >
        <span class={`text-[10px]/[12px] text-white dark:text-gray-800 py-0.5 px-1 rounded mr-2 flex-shrink-0 ${getMethodColor(method)}`}>
          {method}
        </span>
        <span class="text-xs truncate dark:text-neutral-dark-700">{label}</span>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Tag folder — mirrors FolderItem without context menu / modals
// ---------------------------------------------------------------------------

function TagFolder({ tag, searchTerm, activeId, onSelect, level = 0 }) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter operations to those matching the search term
  const visibleOps = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return tag.operations;
    return tag.operations.filter(({ method, path, operation }) =>
      path.toLowerCase().includes(term) ||
      method.toLowerCase().includes(term) ||
      operation.summary?.toLowerCase().includes(term) ||
      operation.operationId?.toLowerCase().includes(term)
    );
  }, [tag.operations, searchTerm]);

  if (visibleOps.length === 0) return null;

  const isDefault = tag.name === 'default';
  const hasChildren = visibleOps.length > 0;
  const marginLeft = level * 10;

  return (
    <li class="folder">
      {/* Only render the folder header for real tags (not the "default" catch-all) */}
      {!isDefault && (
        <div
          class="flex items-center text-gray-700 dark:text-neutral-dark-700 py-1 hover:bg-gray-100 dark:hover:bg-neutral-dark-200 rounded px-1 cursor-pointer"
          style={{ marginLeft: `${marginLeft}px` }}
          onClick={() => setIsExpanded(v => !v)}
        >
          {hasChildren && (
            <svg
              class={`w-3 h-3 mr-1 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"
            class="mr-1 text-gray-500 dark:text-neutral-dark-500 flex-shrink-0"
          >
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
          </svg>
          <span class="text-xs truncate capitalize">{tag.name}</span>
        </div>
      )}

      {(isDefault || isExpanded) && (
        <ul class={isDefault ? 'space-y-0' : 'ml-4 space-y-0'}>
          {visibleOps.map(({ method, path, operation }) => {
            const id = getEndpointId(method, path);
            return (
              <OperationItem
                key={`${method}-${path}`}
                method={method}
                path={path}
                operation={operation}
                isActive={id === activeId}
                onClick={() => onSelect(method, path)}
                level={isDefault ? 0 : 0}
              />
            );
          })}
        </ul>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// OpenAPINavPanel
// ---------------------------------------------------------------------------

export function OpenAPINavPanel({ spec, activeId, onSelect }) {
  const [searchTerm, setSearchTerm] = useState('');

  const tagGroups = useMemo(() => {
    if (!spec?.paths) return [];
    return getOperationsByTag(spec);
  }, [spec]);

  // When a tag group is filtered away entirely, check if there's anything to show
  const hasContent = tagGroups.some(tag => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return tag.operations.length > 0;
    return tag.operations.some(({ method, path, operation }) =>
      path.toLowerCase().includes(term) ||
      method.toLowerCase().includes(term) ||
      operation.summary?.toLowerCase().includes(term) ||
      operation.operationId?.toLowerCase().includes(term)
    );
  });

  const handleSelect = (method, path) => {
    if (onSelect) onSelect(method, path);

    const id = getEndpointId(method, path);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div class="flex flex-col h-full">
      {/* Search */}
      <div class="p-3 border-b border-gray-200 dark:border-neutral-dark-300 flex-shrink-0">
        <div class="relative">
          <div class="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
            <svg class="w-3.5 h-3.5 text-gray-400 dark:text-neutral-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onInput={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter endpoints..."
            class="w-full pl-7 pr-2 py-1.5 text-xs rounded-md border border-gray-300 dark:border-neutral-dark-50 bg-white dark:bg-[#282a36] text-gray-900 dark:text-neutral-dark-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              class="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 dark:text-neutral-dark-400 hover:text-gray-600 dark:hover:text-neutral-dark-600"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tag / operation tree */}
      <div class="flex-1 overflow-y-auto p-3 scrollbar-hide">
        {!hasContent ? (
          <div class="text-center py-6 text-gray-500 dark:text-neutral-dark-500">
            {searchTerm.trim() ? (
              <>
                <svg class="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-neutral-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p class="text-xs">No matches found</p>
              </>
            ) : (
              <p class="text-xs">No endpoints</p>
            )}
          </div>
        ) : (
          <ul class="space-y-1">
            {tagGroups.map(tag => (
              <TagFolder
                key={tag.name}
                tag={tag}
                searchTerm={searchTerm}
                activeId={activeId}
                onSelect={handleSelect}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
