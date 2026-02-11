/**
 * HeaderTable - A generic table for displaying key-value pairs with optional links
 *
 * @param {Object} props
 * @param {Array} props.headers - Array of header objects with name and value
 * @param {string|Object} props.headers[].name - Header name as string or { text, url } for links
 * @param {string|Object} props.headers[].value - Header value as string or { text, url } for links
 * @param {string} [props.nameTitle='Name'] - Title for the name column (set to null to use default)
 * @param {string} [props.valueTitle='Value'] - Title for the value column (set to null to use default)
 * @param {boolean} [props.showTitles=true] - Whether to show the header row with titles
 * @param {string} [props.className] - Additional CSS classes for the container
 * @param {string} [props.nameColumnWidth='50%'] - Width for the name column
 * @param {string} [props.valueColumnWidth='50%'] - Width for the value column
 */
export function HeaderTable({ headers = [], nameTitle = 'Name', valueTitle = 'Value', showTitles = true, className = '', nameColumnWidth = '50%', valueColumnWidth = '50%' }) {
  if (!headers || headers.length === 0) {
    return null;
  }

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
    // For values, just return the text; for names, return as-is
    const text = typeof item === 'object' && item !== null ? item.text : item;
    return isValue ? <span class="text-indigo-600">{text}</span> : text;
  };

  return (
    <div class={`max-w-full overflow-auto ${className}`}>
      <table class="border-collapse text-[11px] w-full table-fixed">
        {showTitles && (
          <thead>
            <tr>
              <th class="py-1 text-xs border-b border-slate-200 text-left font-mono font-bold" style={{ width: nameColumnWidth }}>{nameTitle}</th>
              <th class="py-1 text-xs border-b border-slate-200 text-left font-mono font-bold" style={{ width: valueColumnWidth }}>{valueTitle}</th>
            </tr>
          </thead>
        )}
        <tbody>
          {headers.map((header, index) => (
            <tr key={index}>
              <td class="border-b border-slate-100 py-1 pr-3 font-mono whitespace-nowrap overflow-hidden text-ellipsis truncate" style={{ width: nameColumnWidth }}>
                {renderCell(header.name, false)}
              </td>
              <td class="border-b border-slate-100 py-1 font-mono whitespace-nowrap overflow-hidden text-ellipsis truncate" style={{ width: valueColumnWidth }}>
                {renderCell(header.value, true)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
