import { useState } from 'preact/hooks';

export function ParamsTab({ queryParams, pathParams, onQueryParamsChange, onPathParamsChange }) {
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

  return (
    <>
      {/* Path Parameters Section */}
      <div class="mb-6">
        <div class="flex justify-between items-center mb-2">
          <div class="text-xs text-gray-500 italic">
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
                    class="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                  />
                </div>
                <div class="col-span-5">
                  <input
                    type="text"
                    value={param.key}
                    class="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50 text-gray-500"
                    disabled
                    title="Path parameter key is defined in the URL"
                  />
                </div>
                <div class="col-span-6">
                  <input
                    type="text"
                    value={param.value}
                    onChange={(e) => handlePathParamChange(param.id, 'value', e.target.value)}
                    placeholder="Enter value"
                    class={`w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-sky-500 focus:border-sky-500 ${
                      param.enabled ? 'bg-white' : 'bg-gray-50 text-gray-500'
                    }`}
                    disabled={!param.enabled}
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
          <div class="text-xs text-gray-500 italic">
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
                    class="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                    disabled
                    title="Query parameters are automatically parsed from URL"
                  />
                </div>
                <div class="col-span-5">
                  <input
                    type="text"
                    value={param.key}
                    class="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50 text-gray-500"
                    disabled
                    title="Query parameters are automatically parsed from URL"
                  />
                </div>
                <div class="col-span-6">
                  <input
                    type="text"
                    value={param.value}
                    class="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50 text-gray-500"
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