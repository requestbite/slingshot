import { useState } from 'preact/hooks';

const BODY_TYPES = {
  none: 'None',
  raw: 'Raw',
  'form-data': 'Form Data',
  'url-encoded': 'URL Encoded'
};

const CONTENT_TYPES = {
  'application/json': 'JSON',
  'application/xml': 'XML',
  'text/plain': 'Text',
  'text/html': 'HTML',
  'application/javascript': 'JavaScript'
};

export function BodyTab({
  bodyType,
  bodyContent,
  contentType,
  method,
  onBodyTypeChange,
  onBodyContentChange,
  onContentTypeChange
}) {
  const [formData, setFormData] = useState([]);
  const [urlEncodedData, setUrlEncodedData] = useState([]);

  const isBodyDisabled = ['GET', 'HEAD', 'OPTIONS'].includes(method);

  const addFormDataField = () => {
    const newField = {
      id: crypto.randomUUID(),
      key: '',
      value: '',
      type: 'text', // text or file
      enabled: true
    };
    setFormData([...formData, newField]);
  };

  const removeFormDataField = (id) => {
    setFormData(formData.filter(field => field.id !== id));
  };

  const updateFormDataField = (id, field, value) => {
    const updatedFields = formData.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    setFormData(updatedFields);
  };

  const addUrlEncodedField = () => {
    const newField = {
      id: crypto.randomUUID(),
      key: '',
      value: '',
      enabled: true
    };
    setUrlEncodedData([...urlEncodedData, newField]);
  };

  const removeUrlEncodedField = (id) => {
    setUrlEncodedData(urlEncodedData.filter(field => field.id !== id));
  };

  const updateUrlEncodedField = (id, field, value) => {
    const updatedFields = urlEncodedData.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    setUrlEncodedData(updatedFields);
  };

  const prettifyJson = () => {
    try {
      const parsed = JSON.parse(bodyContent);
      const prettified = JSON.stringify(parsed, null, 2);
      onBodyContentChange(prettified);
    } catch (error) {
      // Invalid JSON, do nothing
      console.warn('Invalid JSON content:', error);
    }
  };

  const isValidJson = () => {
    if (!bodyContent.trim()) return true;
    try {
      JSON.parse(bodyContent);
      return true;
    } catch {
      return false;
    }
  };

  if (isBodyDisabled) {
    return (
      <div class="p-4">
        <div class="text-center py-8 text-gray-500">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
          </svg>
          <p class="text-sm mb-1">Request body not available</p>
          <p class="text-xs text-gray-400">{method} requests cannot have a body</p>
        </div>
      </div>
    );
  }

  return (
    <div class="p-4">
      {/* Body Type Selection */}
      <div class="mb-4">
        <div class="flex flex-wrap gap-2">
          {Object.entries(BODY_TYPES).map(([key, label]) => (
            <label key={key} class="flex items-center cursor-pointer">
              <input
                type="radio"
                name="bodyType"
                value={key}
                checked={bodyType === key}
                onChange={(e) => onBodyTypeChange(e.target.value)}
                class="w-4 h-4 text-sky-600 border-gray-300 focus:ring-sky-500"
              />
              <span class="ml-2 text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Content Type Selection for Raw */}
      {bodyType === 'raw' && (
        <div class="mb-4 flex items-center space-x-3">
          <label class="text-sm font-medium text-gray-700">Content Type:</label>
          <select
            value={contentType}
            onChange={(e) => onContentTypeChange(e.target.value)}
            class="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-sky-500 focus:border-sky-500"
          >
            {Object.entries(CONTENT_TYPES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {contentType === 'application/json' && (
            <button
              onClick={prettifyJson}
              disabled={!isValidJson()}
              class={`px-3 py-1 text-sm rounded transition-colors ${
                isValidJson()
                  ? 'text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200'
                  : 'text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed'
              }`}
            >
              Prettify JSON
            </button>
          )}
        </div>
      )}

      {/* Body Content Based on Type */}
      {bodyType === 'none' && (
        <div class="text-center py-8 text-gray-500">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-sm">No request body</p>
        </div>
      )}

      {bodyType === 'raw' && (
        <div class="space-y-2">
          <div class="relative">
            <textarea
              value={bodyContent}
              onChange={(e) => onBodyContentChange(e.target.value)}
              placeholder={`Enter ${CONTENT_TYPES[contentType]?.toLowerCase() || 'raw'} content here...`}
              class={`w-full h-64 px-3 py-2 text-sm font-mono border rounded focus:ring-sky-500 focus:border-sky-500 resize-y ${
                contentType === 'application/json' && !isValidJson()
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
            />
            {contentType === 'application/json' && !isValidJson() && (
              <div class="mt-1 text-xs text-red-600">
                Invalid JSON format
              </div>
            )}
          </div>
          <div class="text-xs text-gray-500">
            Tip: Use Ctrl+Enter to send the request
          </div>
        </div>
      )}

      {bodyType === 'form-data' && (
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-medium text-gray-700">Form Data Fields</h4>
            <button
              onClick={addFormDataField}
              class="inline-flex items-center px-3 py-1 text-sm text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded transition-colors"
            >
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Field
            </button>
          </div>

          {formData.length === 0 ? (
            <div class="text-center py-6 text-gray-500">
              <p class="text-sm">No form data fields</p>
              <p class="text-xs text-gray-400">Add fields to send form data</p>
            </div>
          ) : (
            <div class="space-y-2">
              <div class="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 pb-2">
                <div class="col-span-1"></div>
                <div class="col-span-4">Key</div>
                <div class="col-span-5">Value</div>
                <div class="col-span-1">Type</div>
                <div class="col-span-1"></div>
              </div>
              {formData.map((field) => (
                <div key={field.id} class="grid grid-cols-12 gap-2 items-center group">
                  <div class="col-span-1 flex justify-center">
                    <input
                      type="checkbox"
                      checked={field.enabled}
                      onChange={() => updateFormDataField(field.id, 'enabled', !field.enabled)}
                      class="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                    />
                  </div>
                  <div class="col-span-4">
                    <input
                      type="text"
                      value={field.key}
                      onChange={(e) => updateFormDataField(field.id, 'key', e.target.value)}
                      placeholder="Field name"
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-sky-500 focus:border-sky-500"
                      disabled={!field.enabled}
                    />
                  </div>
                  <div class="col-span-5">
                    {field.type === 'text' ? (
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => updateFormDataField(field.id, 'value', e.target.value)}
                        placeholder="Value"
                        class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-sky-500 focus:border-sky-500"
                        disabled={!field.enabled}
                      />
                    ) : (
                      <input
                        type="file"
                        onChange={(e) => updateFormDataField(field.id, 'value', e.target.files[0])}
                        class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-sky-500 focus:border-sky-500"
                        disabled={!field.enabled}
                      />
                    )}
                  </div>
                  <div class="col-span-1">
                    <select
                      value={field.type}
                      onChange={(e) => updateFormDataField(field.id, 'type', e.target.value)}
                      class="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:ring-sky-500 focus:border-sky-500"
                      disabled={!field.enabled}
                    >
                      <option value="text">Text</option>
                      <option value="file">File</option>
                    </select>
                  </div>
                  <div class="col-span-1 flex justify-center">
                    <button
                      onClick={() => removeFormDataField(field.id)}
                      class="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all focus:opacity-100"
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
            )}
        </div>
      )}

      {bodyType === 'url-encoded' && (
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-medium text-gray-700">URL Encoded Parameters</h4>
            <button
              onClick={addUrlEncodedField}
              class="inline-flex items-center px-3 py-1 text-sm text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded transition-colors"
            >
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Parameter
            </button>
          </div>

          {urlEncodedData.length === 0 ? (
            <div class="text-center py-6 text-gray-500">
              <p class="text-sm">No URL encoded parameters</p>
              <p class="text-xs text-gray-400">Add parameters to send as application/x-www-form-urlencoded</p>
            </div>
          ) : (
            <div class="space-y-2">
              <div class="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 pb-2">
                <div class="col-span-1"></div>
                <div class="col-span-5">Key</div>
                <div class="col-span-5">Value</div>
                <div class="col-span-1"></div>
              </div>
              {urlEncodedData.map((field) => (
                <div key={field.id} class="grid grid-cols-12 gap-2 items-center group">
                  <div class="col-span-1 flex justify-center">
                    <input
                      type="checkbox"
                      checked={field.enabled}
                      onChange={() => updateUrlEncodedField(field.id, 'enabled', !field.enabled)}
                      class="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                    />
                  </div>
                  <div class="col-span-5">
                    <input
                      type="text"
                      value={field.key}
                      onChange={(e) => updateUrlEncodedField(field.id, 'key', e.target.value)}
                      placeholder="Parameter name"
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-sky-500 focus:border-sky-500"
                      disabled={!field.enabled}
                    />
                  </div>
                  <div class="col-span-5">
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => updateUrlEncodedField(field.id, 'value', e.target.value)}
                      placeholder="Value"
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-sky-500 focus:border-sky-500"
                      disabled={!field.enabled}
                    />
                  </div>
                  <div class="col-span-1 flex justify-center">
                    <button
                      onClick={() => removeUrlEncodedField(field.id)}
                      class="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all focus:opacity-100"
                      title="Remove parameter"
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
        </div>
      )}
    </div>
  );
}