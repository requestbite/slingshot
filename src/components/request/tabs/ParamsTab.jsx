import { useState } from 'preact/hooks'; import { VariableInput } from '../../common/VariableInput';
import { TextInput } from '../../common/TextInput';

export function ParamsTab({ queryParams, pathParams, onQueryParamsChange, onPathParamsChange, onEnterKeyPress, selectedEnvironment }) {
  const handlePathParamChange = (id, field, value) => {
    const updatedParams = pathParams.map(param =>
      param.id === id ? { ...param, [field]: value } : param
    );
    onPathParamsChange(updatedParams);
  };

  const togglePathParamEnabled = (id) => {
    const updatedParams = pathParams.map(param =>
      param.id === id ? { ...param, enabled: !param.enabled } : param
    );
    onPathParamsChange(updatedParams);
  };

  const toggleQueryParamEnabled = (id) => {
    const updatedParams = queryParams.map(param =>
      param.id === id ? { ...param, enabled: !param.enabled } : param
    );
    onQueryParamsChange(updatedParams);
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
                    className={`w-full text-sm ${param.enabled ? '' : 'opacity-50'
                      }`}
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
          <div class="text-xs text-gray-500 dark:text-neutral-dark-500 italic">
            Query parameters are parsed from URL.
          </div>
        </div>

        <div class="space-y-2">
          {queryParams.length === 0 ? (
            <div>No query parameters found.</div>
          ) : (
            queryParams.map((param) => (
              <div key={param.id} class="grid grid-cols-12 gap-2 items-center">
                <div class="col-span-1 flex justify-center">
                  <input
                    type="checkbox"
                    checked={param.enabled}
                    onChange={() => toggleQueryParamEnabled(param.id)}
                    class="w-4 h-4 text-sky-600 border-gray-300 dark:border-neutral-dark-50 rounded focus:ring-sky-500"
                  />
                </div>
                <div class="col-span-5">
                  <TextInput
                    value={param.key}
                    disabled
                    title="Query parameters are automatically parsed from URL"
                  />
                </div>
                <div class="col-span-6">
                  <TextInput
                    value={param.value}
                    disabled
                    title="Query parameters are automatically parsed from URL"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
