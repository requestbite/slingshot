import { useState } from 'preact/hooks';
import { VariableInput } from '../../common/VariableInput';
import { generateUUID } from '../../../utils/uuid.js';

export function HeadersTab({ headers, onHeadersChange, onEnterKeyPress, selectedEnvironment }) {
  const addHeader = () => {
    const newHeader = {
      id: generateUUID(),
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

  return (
    <>
      <div class="flex justify-between items-center mb-2">
        <button
          onClick={addHeader}
          class="px-3 py-1 bg-sky-100 hover:bg-sky-200 text-sky-700 text-sm font-medium rounded-md cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus-icon lucide-plus">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
        </button>
      </div>

      <div class="space-y-2">
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
              <VariableInput
                key={`header-key-${header.id}-${selectedEnvironment?.id || 'none'}`}
                value={header.key}
                onChange={(value) => updateHeader(header.id, 'key', value)}
                onKeyDown={onEnterKeyPress}
                placeholder="Header name"
                className={`w-full text-sm ${header.enabled ? '' : 'opacity-50'
                  }`}
                disabled={!header.enabled}
                selectedEnvironment={selectedEnvironment}
              />
            </div>
            <div class="col-span-5">
              <VariableInput
                key={`header-value-${header.id}-${selectedEnvironment?.id || 'none'}`}
                value={header.value}
                onChange={(value) => updateHeader(header.id, 'value', value)}
                onKeyDown={onEnterKeyPress}
                placeholder="Value"
                className={`w-full text-sm ${header.enabled ? '' : 'opacity-50'
                  }`}
                disabled={!header.enabled}
                selectedEnvironment={selectedEnvironment}
              />
            </div>
            <div class="col-span-1 flex justify-center">
              <button
                onClick={() => removeHeader(header.id)}
                class="p-1 text-red-400 hover:text-red-600 transition-all cursor-pointer"
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
    </>
  );
}
