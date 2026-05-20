import { VariableInput } from '../../common/VariableInput';
import { TextInput } from '../../common/TextInput';
import { Checkbox } from '../../common/Checkbox';
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

  const allEnabled = queryParams.length > 0 && queryParams.every(p => p.enabled);

  const toggleSelectAll = () => {
    const newEnabled = !allEnabled;
    onQueryParamsChange(queryParams.map(p => ({ ...p, enabled: newEnabled })));
  };

  return (
    <>
      {/* Path Parameters Section — only rendered when path params exist */}
      {pathParams.length > 0 && (
        <div class="mb-4">
          <p class="text-sm font-medium text-gray-700 dark:text-neutral-dark-700 mb-2">Path parameters</p>
          <div class="space-y-2">
            {pathParams.map((param) => (
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
            ))}
          </div>
          <div class="border-b border-gray-200 dark:border-neutral-dark-300 mt-4" />
        </div>
      )}

      {/* Query Parameters Section */}
      <div>
        <div class="flex items-center gap-3 flex-nowrap mb-2">
          <button
            onClick={addQueryParam}
            class="flex-shrink-0 px-3 py-1 bg-sky-100 dark:bg-primary-dark-200 hover:bg-sky-200 dark:hover:bg-primary-dark-300 text-sky-700 dark:text-primary-dark-400 text-xs font-medium rounded-md cursor-pointer"
          >
            Add query param
          </button>
          {queryParams.length > 0 && (
            <Checkbox
              checked={allEnabled}
              onChange={toggleSelectAll}
              label="Select all"
            />
          )}
        </div>

        <div class="space-y-2">
          {queryParams.map((param) => (
            <div key={param.id} class="grid grid-cols-12 gap-2 items-center group">
              <div class="col-span-1 flex justify-center">
                <Checkbox
                  checked={param.enabled}
                  onChange={() => toggleQueryParamEnabled(param.id)}
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
          ))}
        </div>
      </div>
    </>
  );
}
