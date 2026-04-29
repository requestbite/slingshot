/**
 * HeaderTable - A generic component for displaying key-value pairs with optional links
 *
 * @param {Object} props
 * @param {Array} props.headers - Array of header objects with name and value
 * @param {string|Object} props.headers[].name - Header name as string or { text, url } for links
 * @param {string|Object} props.headers[].value - Header value as string or { text, url } for links
 * @param {string} [props.nameTitle='Name'] - Title for the name column (set to null to use default)
 * @param {string} [props.valueTitle='Value'] - Title for the value column (set to null to use default)
 * @param {boolean} [props.showTitles=true] - Whether to show the header row with titles
 * @param {string} [props.className] - Additional CSS classes for the container
 * @param {string} [props.nameColumnWidth='50%'] - Width for the name column (applies on sm+ screens)
 * @param {string} [props.valueColumnWidth='50%'] - Width for the value column (applies on sm+ screens)
 */
export function HeaderTable({ headers = [], nameTitle = 'Name', valueTitle = 'Value', showTitles = true, className = '', nameColumnWidth = '50%', valueColumnWidth = '50%' }) {
  if (!headers || headers.length === 0) {
    return null;
  }

  // Stable scope class derived from column widths so responsive styles survive re-renders
  const scopeClass = `ht-${nameColumnWidth.replace(/[^a-z0-9]/gi, '_')}-${valueColumnWidth.replace(/[^a-z0-9]/gi, '_')}`;

  const renderLink = (item) => (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      class="text-sky-500 hover:text-sky-700 inline-flex items-center"
    >
      {item.text}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="inline relative -top-0.5 ml-1"
        stroke="currentColor"
      >
        <path d="M15 3h6v6"></path>
        <path d="M10 14 21 3"></path>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      </svg>
    </a>
  );

  const renderCell = (item, isValue = false) => {
    if (typeof item === 'object' && item !== null && item.url) {
      return renderLink(item);
    }
    const text = typeof item === 'object' && item !== null ? item.text : item;
    return isValue ? <span class="text-indigo-600">{text}</span> : text;
  };

  return (
    <>
      <style>{`
        @media (min-width: 640px) {
          .${scopeClass} .ht-col-name {
            width: ${nameColumnWidth};
            flex-shrink: 0;
          }
          .${scopeClass} .ht-col-value {
            width: ${valueColumnWidth};
            flex-shrink: 0;
          }
        }
      `}</style>
      <div class={`${scopeClass} w-full text-[11px] font-mono ${className}`}>
        {showTitles && (
          <div class="flex flex-row border-b border-slate-200 dark:border-neutral-dark-300 py-1">
            <div class="ht-col-name text-xs font-bold truncate pr-3">{nameTitle}</div>
            <div class="ht-col-value text-xs font-bold truncate hidden sm:block">{valueTitle}</div>
          </div>
        )}
        {headers.map((header, index) => (
          <div key={index} class="flex flex-col sm:flex-row border-b border-slate-100 dark:border-neutral-dark-300 py-1">
            <div class="ht-col-name truncate pr-3">
              {renderCell(header.name, false)}
            </div>
            <div class="ht-col-value truncate pl-4 sm:pl-0">
              {renderCell(header.value, true)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
