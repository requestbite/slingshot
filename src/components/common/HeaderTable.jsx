/**
 * HeaderTable - A generic table for displaying key-value pairs with optional links
 *
 * @param {Object} props
 * @param {Array} props.headers - Array of header objects with name and value
 * @param {string|Object} props.headers[].name - Header name as string or { text, url } for links
 * @param {string|Object} props.headers[].value - Header value as string or { text, url } for links
 * @param {string} [props.className] - Additional CSS classes for the container
 */
export function HeaderTable({ headers = [], className = '' }) {
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
      <table class="border-collapse text-xs w-full table-fixed">
        <thead>
          <tr>
            <th class="py-1 border-b border-slate-200 text-left font-mono font-bold">Name</th>
            <th class="py-1 border-b border-slate-200 text-left font-mono font-bold">Value</th>
          </tr>
        </thead>
        <tbody>
          {headers.map((header, index) => (
            <tr key={index}>
              <td class="border-b border-slate-100 py-1 pr-3 font-mono whitespace-nowrap overflow-hidden text-ellipsis truncate">
                {renderCell(header.name, false)}
              </td>
              <td class="border-b border-slate-100 py-1 font-mono whitespace-nowrap overflow-hidden text-ellipsis truncate">
                {renderCell(header.value, true)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
