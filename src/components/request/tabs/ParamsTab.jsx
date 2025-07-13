import { useState } from 'preact/hooks';

export function ParamsTab({ queryParams, pathParams, onQueryParamsChange, onPathParamsChange }) {
  const [activeParamTab, setActiveParamTab] = useState('query');

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
    <div class="p-4">
      {/* Parameter Type Tabs */}
      <div class="flex space-x-4 mb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveParamTab('query')}
          class={`pb-2 text-sm font-medium transition-colors ${
            activeParamTab === 'query'
              ? 'text-sky-600 border-b-2 border-sky-600'
              : 'text-gray-600 hover:text-sky-600'
          }`}
        >
          Query Parameters
          {queryParams.length > 0 && (
            <span class="ml-1 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">
              {queryParams.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveParamTab('path')}
          class={`pb-2 text-sm font-medium transition-colors ${
            activeParamTab === 'path'
              ? 'text-sky-600 border-b-2 border-sky-600'
              : 'text-gray-600 hover:text-sky-600'
          }`}
        >
          Path Parameters
          {pathParams.length > 0 && (
            <span class="ml-1 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">
              {pathParams.length}
            </span>
          )}
        </button>
      </div>

      {/* Query Parameters */}
      {activeParamTab === 'query' && (
        <div>
          {queryParams.length === 0 ? (
            <div class="text-center py-8 text-gray-500">
              <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p class="text-sm mb-1">No query parameters</p>
              <p class="text-xs text-gray-400">Query parameters are automatically parsed from the URL</p>
            </div>
          ) : (
            <div class="space-y-2">
              <div class="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 pb-2">
                <div class="col-span-1"></div>
                <div class="col-span-5">Key</div>
                <div class="col-span-6">Value</div>
              </div>
              {queryParams.map((param) => (
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
              ))}
              <div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div class="flex items-start">
                  <svg class="w-4 h-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div class="text-xs text-blue-700">
                    <p class="font-medium mb-1">Query parameters are read-only</p>
                    <p>These parameters are automatically parsed from the URL. To modify them, edit the URL directly.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Path Parameters */}
      {activeParamTab === 'path' && (
        <div>
          {pathParams.length === 0 ? (
            <div class="text-center py-8 text-gray-500">
              <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p class="text-sm mb-1">No path parameters</p>
              <p class="text-xs text-gray-400">Path parameters are defined using {`{param}`} syntax in the URL</p>
            </div>
          ) : (
            <div class="space-y-2">
              <div class="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 pb-2">
                <div class="col-span-1"></div>
                <div class="col-span-5">Key</div>
                <div class="col-span-6">Value</div>
              </div>
              {pathParams.map((param) => (
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
              ))}
              <div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div class="flex items-start">
                  <svg class="w-4 h-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div class="text-xs text-blue-700">
                    <p class="font-medium mb-1">Path parameters</p>
                    <p>These are automatically detected from {`{param}`} syntax in your URL. Provide values to replace them in the actual request.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}