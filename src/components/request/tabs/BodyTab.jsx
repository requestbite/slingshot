import { useState, useEffect } from 'preact/hooks';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { oneDark } from '@codemirror/theme-one-dark';
import { autocompletion } from '@codemirror/autocomplete';
import { bracketMatching } from '@codemirror/language';

const BODY_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'raw', label: 'Raw' },
  { value: 'form-data', label: 'multipart/form-data' },
  { value: 'url-encoded', label: 'x-www-form-urlencoded' }
];

const CONTENT_TYPES = [
  { value: 'application/json', label: 'JSON' },
  { value: 'application/xml', label: 'XML' },
  { value: 'text/plain', label: 'Text' }
];

export function BodyTab({
  bodyType,
  bodyContent,
  contentType,
  method,
  formData = [],
  urlEncodedData = [],
  onBodyTypeChange,
  onBodyContentChange,
  onContentTypeChange,
  onFormDataChange,
  onUrlEncodedDataChange
}) {
  const isBodyDisabled = ['GET', 'HEAD', 'OPTIONS'].includes(method);
  
  // JSON validation state
  const [isValidJson, setIsValidJson] = useState(true);

  // Validate JSON when content type changes to JSON
  useEffect(() => {
    if (contentType === 'application/json') {
      validateJson(bodyContent);
    } else {
      setIsValidJson(true);
    }
  }, [contentType, bodyContent]);

  // Validate JSON on content change
  const validateJson = (content) => {
    if (!content.trim()) {
      setIsValidJson(true);
      return true;
    }
    
    try {
      JSON.parse(content);
      setIsValidJson(true);
      return true;
    } catch (error) {
      setIsValidJson(false);
      return false;
    }
  };

  // Handle body content change with JSON validation
  const handleBodyContentChange = (value) => {
    onBodyContentChange(value);
    
    // Only validate JSON if content type is JSON
    if (contentType === 'application/json') {
      validateJson(value);
    } else {
      setIsValidJson(true);
    }
  };

  // Prettify JSON function
  const prettifyJson = () => {
    if (contentType === 'application/json' && bodyContent && isValidJson) {
      try {
        const parsed = JSON.parse(bodyContent);
        const prettified = JSON.stringify(parsed, null, 2);
        onBodyContentChange(prettified);
      } catch (error) {
        console.error('Failed to prettify JSON:', error);
      }
    }
  };

  // Get CodeMirror extensions based on content type
  const getCodeMirrorExtensions = (contentType) => {
    const baseExtensions = [
      bracketMatching(),
      autocompletion()
    ];

    switch (contentType) {
      case 'application/json':
        return [...baseExtensions, json()];
      case 'application/xml':
        return [...baseExtensions, xml()];
      case 'text/plain':
      default:
        return baseExtensions;
    }
  };

  const addFormDataField = () => {
    const newField = {
      id: crypto.randomUUID(),
      key: '',
      value: '',
      type: 'text',
      enabled: true
    };
    onFormDataChange([...formData, newField]);
  };

  const removeFormDataField = (id) => {
    onFormDataChange(formData.filter(field => field.id !== id));
  };

  const updateFormDataField = (id, field, value) => {
    const updatedFields = formData.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onFormDataChange(updatedFields);
  };

  const toggleFormDataFieldEnabled = (id) => {
    const updatedFields = formData.map(item =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    onFormDataChange(updatedFields);
  };

  return (
    <>
      {/* Request Type Toggle */}
      <div class="mb-2 overflow-x-auto scrollbar-hide">
        <div class="flex items-center flex-nowrap min-w-max">
          {BODY_TYPES.map(type => (
            <label key={type.value} class="inline-flex items-center mr-4 whitespace-nowrap">
              <input
                type="radio"
                name="requestType"
                value={type.value}
                checked={bodyType === type.value}
                onChange={(e) => onBodyTypeChange(e.target.value)}
                class="h-4 w-4 text-sky-600"
                disabled={isBodyDisabled && type.value !== 'none'}
              />
              <span class="ml-2">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Content Type Select and Controls */}
      {bodyType === 'raw' && (
        <div class="flex items-center justify-between w-full mb-2">
          <div class="flex items-center space-x-2">
            <div class="relative w-32">
              <select
                value={contentType}
                onChange={(e) => onContentTypeChange(e.target.value)}
                class="w-full appearance-none rounded-md bg-white py-1 pl-3 pr-8 text-xs text-gray-900 outline -outline-offset-1 outline-gray-300 focus:outline focus:-outline-offset-2 focus:outline-sky-500"
              >
                {CONTENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <svg class="pointer-events-none absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 h-3 w-3"
                viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" data-slot="icon">
                <path fill-rule="evenodd"
                  d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                  clip-rule="evenodd" />
              </svg>
            </div>
            
            {/* Prettify Button - only show for JSON content type */}
            {contentType === 'application/json' && (
              <button 
                onClick={prettifyJson}
                disabled={!isValidJson || !bodyContent.trim()}
                class={`px-2 py-1 text-xs font-medium rounded-md cursor-pointer ${
                  isValidJson && bodyContent.trim()
                    ? 'bg-sky-100 hover:bg-sky-200 text-sky-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Prettify
              </button>
            )}
            
            {/* Invalid JSON indicator */}
            {contentType === 'application/json' && !isValidJson && bodyContent.trim() && (
              <span class="flex items-center text-xs text-red-500 font-normal">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info-icon lucide-info mr-1">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4"/>
                  <path d="M12 8h.01"/>
                </svg>
                Invalid JSON.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Raw Body Content */}
      {bodyType === 'raw' && (
        <div class="mb-2">
          <CodeMirror
            value={bodyContent}
            onChange={handleBodyContentChange}
            placeholder="Enter request body"
            extensions={getCodeMirrorExtensions(contentType)}
            theme="light"
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              dropCursor: false,
              allowMultipleSelections: false,
              indentOnInput: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              rectangularSelection: false,
              searchKeymap: false,
              highlightSelectionMatches: false
            }}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '12px',
              fontFamily: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace'
            }}
            height="256px"
          />
        </div>
      )}

      {/* Form Data Content */}
      {bodyType === 'form-data' && (
        <div class="form-request-content">
          <div class="flex justify-between items-center mb-2">
            <button
              onClick={addFormDataField}
              class="px-3 py-1 bg-sky-100 hover:bg-sky-200 text-sky-700 text-sm font-medium rounded-md cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus-icon lucide-plus">
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
            </button>
          </div>

          <div class="space-y-2">
            {formData.map((field) => (
              <div key={field.id} class="grid grid-cols-12 gap-2 items-center">
                <div class="col-span-1 flex justify-center">
                  <input
                    type="checkbox"
                    checked={field.enabled}
                    onChange={() => toggleFormDataFieldEnabled(field.id)}
                    class="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                  />
                </div>
                <div class="col-span-5">
                  <input
                    key={`form-key-${field.id}`}
                    type="text"
                    value={field.key}
                    onInput={(e) => updateFormDataField(field.id, 'key', e.target.value)}
                    onChange={(e) => updateFormDataField(field.id, 'key', e.target.value)}
                    placeholder="Key"
                    class={`w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-sky-500 focus:border-sky-500 ${field.enabled ? 'bg-white' : 'bg-gray-50 text-gray-500'
                      }`}
                    disabled={!field.enabled}
                  />
                </div>
                <div class="col-span-5">
                  <input
                    key={`form-value-${field.id}`}
                    type="text"
                    value={field.value}
                    onInput={(e) => updateFormDataField(field.id, 'value', e.target.value)}
                    onChange={(e) => updateFormDataField(field.id, 'value', e.target.value)}
                    placeholder="Value"
                    class={`w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-sky-500 focus:border-sky-500 ${field.enabled ? 'bg-white' : 'bg-gray-50 text-gray-500'
                      }`}
                    disabled={!field.enabled}
                  />
                </div>
                <div class="col-span-1 flex justify-center">
                  <button
                    onClick={() => removeFormDataField(field.id)}
                    class="p-1 text-red-400 hover:text-red-600 transition-all"
                    title="Remove field"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
