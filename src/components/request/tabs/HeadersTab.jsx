import { useState } from 'preact/hooks';

export function HeadersTab({ headers, onHeadersChange }) {
  const addHeader = () => {
    const newHeader = {
      id: crypto.randomUUID(),
      key: '',
      value: '',
      enabled: true
    };
    onHeadersChange([...headers, newHeader]);
  };

  const removeHeader = (id) => {
    onHeadersChange(headers.filter(header => header.id !== id));
  };

  const updateHeader = (id, field, value) => {
    const updatedHeaders = headers.map(header =>
      header.id === id ? { ...header, [field]: value } : header
    );
    onHeadersChange(updatedHeaders);
  };

  const toggleHeaderEnabled = (id) => {
    const updatedHeaders = headers.map(header =>
      header.id === id ? { ...header, enabled: !header.enabled } : header
    );
    onHeadersChange(updatedHeaders);
  };

  const getCommonHeaders = () => [
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
    'Authorization',
    'Cache-Control',
    'Content-Length',
    'Content-Type',
    'Cookie',
    'Host',
    'Origin',
    'Referer',
    'User-Agent',
    'X-Requested-With'
  ];

  return (
    <div class="p-4">
      {/* Add Header Button */}
      <div class="mb-4">
        <button
          onClick={addHeader}
          class="inline-flex items-center px-3 py-2 text-sm font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-md transition-colors"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Header
        </button>
      </div>

      {/* Headers List */}
      {headers.length === 0 ? (
        <div class="text-center py-8 text-gray-500">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p class="text-sm mb-1">No headers</p>
          <p class="text-xs text-gray-400">Add custom headers for your request</p>
        </div>
      ) : (
        <div class="space-y-2">
          {/* Column Headers */}
          <div class="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 pb-2">
            <div class="col-span-1"></div>
            <div class="col-span-5">Header Name</div>
            <div class="col-span-5">Value</div>
            <div class="col-span-1"></div>
          </div>

          {/* Header Rows */}
          {headers.map((header) => (
            <div key={header.id} class="grid grid-cols-12 gap-2 items-center group">
              <div class="col-span-1 flex justify-center">
                <input
                  type="checkbox"
                  checked={header.enabled}
                  onChange={() => toggleHeaderEnabled(header.id)}
                  class="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                />
              </div>
              <div class="col-span-5">
                <input
                  type="text"
                  value={header.key}
                  onChange={(e) => updateHeader(header.id, 'key', e.target.value)}
                  placeholder="Header name"
                  list={`header-suggestions-${header.id}`}
                  class={`w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-sky-500 focus:border-sky-500 ${
                    header.enabled ? 'bg-white' : 'bg-gray-50 text-gray-500'
                  }`}
                  disabled={!header.enabled}
                />
                <datalist id={`header-suggestions-${header.id}`}>
                  {getCommonHeaders().map(commonHeader => (
                    <option key={commonHeader} value={commonHeader} />
                  ))}
                </datalist>
              </div>
              <div class="col-span-5">
                <input
                  type="text"
                  value={header.value}
                  onChange={(e) => updateHeader(header.id, 'value', e.target.value)}
                  placeholder="Value"
                  class={`w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-sky-500 focus:border-sky-500 ${
                    header.enabled ? 'bg-white' : 'bg-gray-50 text-gray-500'
                  }`}
                  disabled={!header.enabled}
                />
              </div>
              <div class="col-span-1 flex justify-center">
                <button
                  onClick={() => removeHeader(header.id)}
                  class="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all focus:opacity-100"
                  title="Remove header"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Section */}
      {headers.length > 0 && (
        <div class="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div class="flex items-start">
            <svg class="w-4 h-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="text-xs text-blue-700">
              <p class="font-medium mb-1">Headers will be sent with your request</p>
              <p>Use the checkbox to temporarily disable headers without removing them. Some headers like Content-Type may be automatically added based on your request body.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}