import { VariableInput } from '../../common/VariableInput';
import { TextInput } from '../../common/TextInput';
import { generateUUID } from '../../../utils/uuid.js';

export function ParamsTab({ queryParams, pathParams, onQueryParamsChange, onPathParamsChange, onEnterKeyPress, selectedEnvironment }) {
  const handlePathParamChange = (id, field, value) => {
    onPathParamsChange(pathParams.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const togglePathParamEnabled = (id) => {
    onPathParamsChange(pathParams.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  const addQueryParam = () => {
    onQueryParamsChange([...queryParams, { id: generateUUID(), key: '', value: '', enabled: true }]);
  };

  const removeQueryParam = (id) => {
    onQueryParamsChange(queryParams.filter(p => p.id !== id));
  };

  const updateQueryParam = (id, field, value) => {
    onQueryParamsChange(queryParams.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const toggleQueryParamEnabled = (id) => {
    onQueryParamsChange(queryParams.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  return (
    <>
      {/* Path Parameters Section */}
      <div class="mb-6">
        <div class="flex justify-between items-center mb-2">
          <div class="text-xs text-gray-500 dark:text-neutral-dark-500 italic">
            Path parameters are parsed from URL.
          </div>
        </div>

        <div class="space-y-2">
          {pathParams.length === 0 ? (
            <div>No path parameters found.</div>
          ) : (
            pathParams.map((param) => (
              <div key={param.id} class="grid grid-cols-12 gap-2 items-center">
                <div class="col-span-1 flex justify-center">
                  <input
                    type="checkbox"
                    checked={param.enabled}
                    onChange={() => togglePathParamEnabled(param.id)}
                    class="w-4 h-4 text-sky-600 border-gray-300 dark:border-neutral-dark-50 rounded focus:ring-sky-500"
                  />
                </div>
                <div class="col-span-5">
                  <TextInput
                    value={param.key}
                    disabled
                    title="Path parameter key is defined in the URL"
                  />
                </div>
                <div class="col-span-6">
                  <VariableInput
                    key={`pathparam-${param.id}-${selectedEnvironment?.id || 'none'}`}
                    value={param.value}
                    onChange={(value) => handlePathParamChange(param.id, 'value', value)}
                    onKeyDown={onEnterKeyPress}
                    placeholder="Enter value"
                    className={`w-full text-sm ${param.enabled ? '' : 'opacity-50'}`}
                    disabled={!param.enabled}
                    selectedEnvironment={selectedEnvironment}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Query Parameters Section */}
      <div>
        <div class="flex justify-between items-center mb-2">
          <button
            onClick={addQueryParam}
            class="px-3 py-1 bg-sky-100 dark:bg-primary-dark-200 hover:bg-sky-200 dark:hover:bg-primary-dark-300 text-sky-700 dark:text-primary-dark-400 text-sm font-medium rounded-md cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
          </button>
          <div class="text-xs text-gray-500 dark:text-neutral-dark-500 italic">
            Query params sync with URL bar.
          </div>
        </div>

        <div class="space-y-2">
          {queryParams.length === 0 ? (
            <div>No query parameters found.</div>
          ) : (
            queryParams.map((param) => (
              <div key={param.id} class="grid grid-cols-12 gap-2 items-center group">
                <div class="col-span-1 flex justify-center">
                  <input
                    type="checkbox"
                    checked={param.enabled}
                    onChange={() => toggleQueryParamEnabled(param.id)}
                    class="w-4 h-4 text-sky-600 border-gray-300 dark:border-neutral-dark-50 rounded focus:ring-sky-500"
                  />
                </div>
                <div class="col-span-5">
                  <VariableInput
                    key={`queryparam-key-${param.id}-${selectedEnvironment?.id || 'none'}`}
                    value={param.key}
                    onChange={(value) => updateQueryParam(param.id, 'key', value)}
                    onKeyDown={onEnterKeyPress}
                    placeholder="Parameter name"
                    className={`w-full text-sm ${param.enabled ? '' : 'opacity-50'}`}
                    disabled={!param.enabled}
                    selectedEnvironment={selectedEnvironment}
                  />
                </div>
                <div class="col-span-5">
                  <VariableInput
                    key={`queryparam-value-${param.id}-${selectedEnvironment?.id || 'none'}`}
                    value={param.value}
                    onChange={(value) => updateQueryParam(param.id, 'value', value)}
                    onKeyDown={onEnterKeyPress}
                    placeholder="Value"
                    className={`w-full text-sm ${param.enabled ? '' : 'opacity-50'}`}
                    disabled={!param.enabled}
                    selectedEnvironment={selectedEnvironment}
                  />
                </div>
                <div class="col-span-1 flex justify-center">
                  <button
                    onClick={() => removeQueryParam(param.id)}
                    class="p-1 text-red-400 hover:text-red-600 transition-all cursor-pointer"
                    title="Remove parameter"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
