import { useState } from 'preact/hooks';
import { VariableInput } from '../../common/VariableInput';
import { generateUUID } from '../../../utils/uuid.js';

const COMMON_HEADERS = [
  'Accept',
  'Accept-Charset',
  'Accept-Encoding',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Connection',
  'Content-Length',
  'Content-Type',
  'Cookie',
  'DNT',
  'Expect',
  'Forwarded',
  'From',
  'Host',
  'If-Match',
  'If-Modified-Since',
  'If-None-Match',
  'If-Range',
  'If-Unmodified-Since',
  'Origin',
  'Pragma',
  'Priority',
  'Proxy-Authorization',
  'Range',
  'Referer',
  'Sec-Fetch-Dest',
  'Sec-Fetch-Mode',
  'Sec-Fetch-Site',
  'Sec-GPC',
  'TE',
  'Upgrade',
  'User-Agent',
  'Via',
  'Warning',
];

function getFilteredHeaders(value) {
  // Suppress suggestions while user is typing a variable reference
  if (value && /\{\{[^}]*$/.test(value)) return [];
  if (!value) return COMMON_HEADERS.slice(0, 10);
  const lower = value.toLowerCase();
  return COMMON_HEADERS.filter(h => h.toLowerCase().includes(lower)).slice(0, 10);
}

export function HeadersTab({ headers, onHeadersChange, onEnterKeyPress, selectedEnvironment }) {
  const [activeHeaderId, setActiveHeaderId] = useState(null);
  const [headerSuggestions, setHeaderSuggestions] = useState([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);

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
    if (field === 'key' && activeHeaderId === id) {
      setHeaderSuggestions(getFilteredHeaders(value));
      setSuggestionIndex(0);
    }
  };

  const toggleHeaderEnabled = (id) => {
    const updatedHeaders = headers.map(header =>
      header.id === id ? { ...header, enabled: !header.enabled } : header
    );
    onHeadersChange(updatedHeaders);
  };

  const handleHeaderKeyFocus = (id, currentValue) => {
    setActiveHeaderId(id);
    setHeaderSuggestions(getFilteredHeaders(currentValue));
    setSuggestionIndex(0);
  };

  const handleHeaderKeyBlur = () => {
    setTimeout(() => setActiveHeaderId(null), 150);
  };

  const selectSuggestion = (headerId, suggestion) => {
    // Write the text and move the caret to the end synchronously, before the React
    // state update. VariableInput's effect will then capture currentCursor = end,
    // so its own RAF restores the cursor to the correct position.
    const el = document.activeElement;
    if (el && el.contentEditable === 'true') {
      el.textContent = suggestion;
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
    updateHeader(headerId, 'key', suggestion);
    setHeaderSuggestions([]);
  };

  const handleHeaderKeyDown = (e, headerId) => {
    const showSuggestions = activeHeaderId === headerId && headerSuggestions.length > 0;

    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(prev => prev < headerSuggestions.length - 1 ? prev + 1 : 0);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(prev => prev > 0 ? prev - 1 : headerSuggestions.length - 1);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectSuggestion(headerId, headerSuggestions[suggestionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setActiveHeaderId(null);
        return;
      }
    }

    onEnterKeyPress?.(e);
  };

  return (
    <>
      <div class="flex justify-between items-center mb-2">
        <button
          onClick={addHeader}
          class="text-xs px-3 py-1 bg-sky-100 dark:bg-primary-dark-200 hover:bg-sky-200 dark:hover:bg-primary-dark-300 text-sky-700 dark:text-primary-dark-400 text-sm font-medium rounded-md cursor-pointer"
        >
          Add header
        </button>
      </div>

      <div class="space-y-1">
        {headers.map((header) => (
          <div key={header.id} class="grid grid-cols-12 gap-2 items-center group">
            <div class="col-span-1 flex justify-center">
              <input
                type="checkbox"
                checked={header.enabled}
                onChange={() => toggleHeaderEnabled(header.id)}
                class="w-4 h-4 text-sky-600 border-gray-300 dark:border-neutral-dark-50 rounded focus:ring-sky-500"
              />
            </div>
            <div class="col-span-5 compact-vi relative">
              <VariableInput
                key={`header-key-${header.id}-${selectedEnvironment?.id || 'none'}`}
                value={header.key}
                onChange={(value) => updateHeader(header.id, 'key', value)}
                onKeyDown={(e) => handleHeaderKeyDown(e, header.id)}
                onFocus={() => handleHeaderKeyFocus(header.id, header.key)}
                onBlur={handleHeaderKeyBlur}
                placeholder="Header name"
                className={`w-full text-sm ${header.enabled ? '' : 'opacity-50'}`}
                disabled={!header.enabled}
                selectedEnvironment={selectedEnvironment}
              />
              {activeHeaderId === header.id && headerSuggestions.length > 0 && (
                <div
                  class="absolute z-50 bg-white dark:bg-surface-dark-elevated rounded-md shadow-lg ring-1 ring-black/5 dark:ring-white/10 max-h-48 overflow-y-auto"
                  style={{ top: '100%', left: 0, marginTop: '2px', minWidth: '200px' }}
                >
                  {headerSuggestions.map((suggestion, index) => (
                    <div
                      key={suggestion}
                      class={`px-3 py-2 cursor-pointer text-sm font-medium ${index === suggestionIndex
                        ? 'bg-sky-100 dark:bg-primary-dark-200 text-sky-900 dark:text-primary-dark-400'
                        : 'text-gray-700 dark:text-neutral-dark-700 hover:bg-gray-100 dark:hover:bg-neutral-dark-200'
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectSuggestion(header.id, suggestion);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div class="col-span-5 compact-vi">
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
