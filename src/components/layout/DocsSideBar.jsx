import { useState, useEffect } from 'preact/hooks';
import { MarkdownPreview } from '../common/MarkdownPreview';
import { MarkdownModal } from '../modals/MarkdownModal';
import { ExampleViewer } from '../common/ExampleViewer';
import { SchemaViewer } from '../common/SchemaViewer';
import { Select } from '../common/Select';
import { useAppContext } from '../../hooks/useAppContext';
import { apiClient } from '../../api';
import { getMethodColor } from '../../utils/httpMethods';
import {
  parseRequestExamples,
  parseResponseExamples,
  getResponseStatusCodes,
  getStatusCodeDisplayName,
  getExampleContentType
} from '../../utils/exampleParser';
import {
  parseParametersSchema,
  parseRequestBodySchema,
  parseResponseSchemas
} from '../../utils/schemaParser';

export function DocsSideBar({ onClose: _onClose }) {
  const { selectedCollection, selectedRequest, loadCollections } = useAppContext();
  const [showMarkdownModal, setShowMarkdownModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedResponseStatus, setSelectedResponseStatus] = useState('');
  const [selectedTocSection, setSelectedTocSection] = useState('show-all');

  const handleEditDescription = async (newDescription) => {
    if (!selectedCollection?.id) return;

    setIsUpdating(true);
    try {
      await apiClient.updateCollection(selectedCollection.id, {
        description: newDescription
      });

      // Refresh collections to get updated data
      await loadCollections();
    } catch (error) {
      console.error('Failed to update collection description:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Parse examples data when request changes
  const requestExamples = selectedRequest ? parseRequestExamples(selectedRequest.request_example) : [];
  const responseExamples = selectedRequest ? parseResponseExamples(selectedRequest.response_examples) : {};
  const responseStatusCodes = getResponseStatusCodes(responseExamples);

  // Parse schema data when request changes
  const parametersSchema = selectedRequest ? parseParametersSchema(selectedRequest.parameters_schema) : null;
  const requestBodySchema = selectedRequest ? parseRequestBodySchema(selectedRequest.request_body_schema) : null;
  const responseSchemas = selectedRequest ? parseResponseSchemas(selectedRequest.response_schemas) : {};

  // Handle response status selection when data changes
  useEffect(() => {
    // Auto-select first status code if none selected
    if (responseStatusCodes.length > 0 && !selectedResponseStatus) {
      setSelectedResponseStatus(responseStatusCodes[0]);
    }
    // Reset selected status if it's no longer available
    else if (selectedResponseStatus && !responseStatusCodes.includes(selectedResponseStatus)) {
      setSelectedResponseStatus(responseStatusCodes[0] || '');
    }
  }, [responseStatusCodes, selectedResponseStatus]);

  // Reset response status when request changes
  useEffect(() => {
    setSelectedResponseStatus('');
    setSelectedTocSection('show-all');
  }, [selectedRequest?.id]);

  // Build table of contents sections
  const tocSections = [];
  if (parametersSchema?.path && Object.keys(parametersSchema.path).length > 0) {
    tocSections.push({ id: 'path-parameters', label: 'Path Parameters' });
  }
  if (parametersSchema?.query && Object.keys(parametersSchema.query).length > 0) {
    tocSections.push({ id: 'query-parameters', label: 'Query Parameters' });
  }
  if (requestBodySchema) {
    tocSections.push({ id: 'request-body', label: 'Request Body Schema' });
  }
  if (requestExamples.length > 0) {
    tocSections.push({ id: 'request-examples', label: 'Request Examples' });
  }
  if (Object.keys(responseSchemas).length > 0) {
    tocSections.push({ id: 'response-schema', label: 'Response Schema' });
  }
  if (responseStatusCodes.length > 0) {
    tocSections.push({ id: 'response-examples', label: 'Response Examples' });
  }

  const shouldShowSection = (sectionId) => {
    return selectedTocSection === 'show-all' || selectedTocSection === sectionId;
  };

  return (
    <>
      {/* Documentation Sidebar */}
      <aside class="bg-white rounded-lg md:border border-gray-300 h-full">
        <div class="flex grow flex-col gap-y-5 overflow-y-auto p-4">
          <nav class="flex flex-1 flex-col space-y-4">
            {selectedRequest ? (
              <>
                {/* Request Header */}
                <div class="flex items-center gap-2">
                  <span class={`text-[10px]/[12px] text-white py-0.5 px-1 rounded flex-shrink-0 ${getMethodColor(selectedRequest.method)}`}>
                    {selectedRequest.method}
                  </span>
                  <h2 class="text-sm font-medium text-gray-900 truncate" title={selectedRequest.name || selectedRequest.url || 'Untitled Request'}>
                    {selectedRequest.name || selectedRequest.url || 'Untitled Request'}
                  </h2>
                </div>

                {/* Request Summary */}
                {selectedRequest.summary && selectedRequest.summary.trim() && (
                  <div class="text-sm text-gray-700">
                    {selectedRequest.summary}
                  </div>
                )}

                {/* Request Description */}
                {selectedRequest.description && selectedRequest.description.trim() && (
                  <div class={`${selectedRequest.summary && selectedRequest.summary.trim() ? 'pt-3 border-t border-gray-200' : ''}`}>
                    <div class="text-left">
                      <MarkdownPreview markdown={selectedRequest.description} />
                    </div>
                  </div>
                )}

                {/* Table of Contents */}
                {tocSections.length > 0 && (
                  <div class="pt-3 pb-4 border-t border-b border-gray-200">
                    <h3 class="text-xs font-medium text-gray-600 mb-2">Table of Contents</h3>
                    <div class="space-y-1">
                      {/* Show All option */}
                      <label class="flex items-center text-xs text-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          name="toc-section"
                          value="show-all"
                          checked={selectedTocSection === 'show-all'}
                          onChange={(e) => setSelectedTocSection(e.target.value)}
                          class="mr-2 text-sky-600 focus:ring-sky-500"
                        />
                        Show all
                      </label>

                      {/* Individual sections */}
                      {tocSections.map((section) => (
                        <label key={section.id} class="flex items-center text-xs text-gray-700 cursor-pointer">
                          <input
                            type="radio"
                            name="toc-section"
                            value={section.id}
                            checked={selectedTocSection === section.id}
                            onChange={(e) => setSelectedTocSection(e.target.value)}
                            class="mr-2 text-sky-600 focus:ring-sky-500"
                          />
                          <span class="hover:text-sky-600">{section.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Request Documentation */}
                <div class="flex-1 min-h-0 space-y-4">
                  {/* Schema Viewer - Parameters and Request Body */}
                  {(parametersSchema || requestBodySchema) && (shouldShowSection('path-parameters') || shouldShowSection('query-parameters') || shouldShowSection('request-body')) && (
                    <div id="parameters-schema">
                      <SchemaViewer
                        parametersSchema={parametersSchema}
                        requestBodySchema={requestBodySchema}
                        responseSchemas={{}}
                      />
                    </div>
                  )}

                  {/* Request Examples */}
                  {requestExamples.length > 0 && shouldShowSection('request-examples') && (
                    <div id="request-examples">
                      <ExampleViewer
                        examples={requestExamples}
                        title="Request Examples"
                        contentType={getExampleContentType(selectedRequest, 'request')}
                      />
                    </div>
                  )}

                  {/* Response Schema */}
                  {Object.keys(responseSchemas).length > 0 && shouldShowSection('response-schema') && (
                    <div id="response-schema" class={`${(parametersSchema || requestBodySchema) && (shouldShowSection('path-parameters') || shouldShowSection('query-parameters') || shouldShowSection('request-body')) ? 'pt-4 border-t border-gray-200' : ''}`}>
                      <SchemaViewer
                        parametersSchema={null}
                        requestBodySchema={null}
                        responseSchemas={responseSchemas}
                      />
                    </div>
                  )}

                  {/* Response Examples */}
                  {responseStatusCodes.length > 0 && shouldShowSection('response-examples') && (
                    <div id="response-examples" class="space-y-2">
                      <div class="flex items-center justify-between">
                        <label class="block text-xs font-medium text-gray-600">Response Examples</label>
                      </div>

                      {responseStatusCodes.length > 1 && (
                        <Select
                          value={selectedResponseStatus}
                          onChange={setSelectedResponseStatus}
                          options={responseStatusCodes.map(code => ({
                            value: code,
                            label: getStatusCodeDisplayName(code)
                          }))}
                          placeholder="Select status code..."
                          size="small"
                        />
                      )}

                      {selectedResponseStatus && responseExamples[selectedResponseStatus] && (
                        <ExampleViewer
                          examples={responseExamples[selectedResponseStatus]}
                          title={responseStatusCodes.length === 1 ? getStatusCodeDisplayName(selectedResponseStatus) : ""}
                          contentType={getExampleContentType(selectedRequest, 'response')}
                        />
                      )}
                    </div>
                  )}

                  {/* Show placeholder when no examples or schemas available */}
                  {requestExamples.length === 0 &&
                    responseStatusCodes.length === 0 &&
                    !parametersSchema &&
                    !requestBodySchema &&
                    Object.keys(responseSchemas).length === 0 && (
                      <div class="text-left text-gray-500 italic text-sm">
                        No examples or schemas available for this request.
                      </div>
                    )}
                </div>
              </>
            ) : selectedCollection ? (
              <>
                {/* Collection Header */}
                <div class="flex items-center justify-between">
                  <h2 class="text-sm font-medium text-gray-900 truncate" title={selectedCollection.name}>
                    {selectedCollection.name}
                  </h2>
                </div>

                {/* Edit Button */}
                <button
                  onClick={() => setShowMarkdownModal(true)}
                  disabled={isUpdating}
                  class="w-full cursor-pointer rounded-md px-3 py-2 text-xs focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-sky-500 bg-sky-100 hover:bg-sky-200 text-sky-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
                  </svg>
                  {isUpdating ? 'Updating...' : 'Edit Documentation'}
                </button>

                {/* Collection Documentation */}
                <div class="flex-1 min-h-0">
                  {selectedCollection.description && selectedCollection.description.trim() ? (
                    <div class="text-left">
                      <MarkdownPreview markdown={selectedCollection.description} />
                    </div>
                  ) : (
                    <div class="text-left text-gray-500 italic text-sm">
                      No documentation provided for this collection.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Default Header */}
                <div class="flex items-center justify-between">
                  <h2 class="text-sm font-medium text-gray-900">Documentation</h2>
                </div>

                {/* Placeholder content */}
                <div class="space-y-4">
                  <div class="text-sm text-gray-600">
                    <p class="mb-3">Collection documentation will appear here when you select a collection.</p>

                    <div class="space-y-2">
                      <div class="p-3 bg-gray-50 rounded-md">
                        <h3 class="text-xs font-medium text-gray-700 mb-1">Collection Info</h3>
                        <p class="text-xs text-gray-500">Collection description and documentation will be displayed here.</p>
                      </div>

                      <div class="p-3 bg-gray-50 rounded-md">
                        <h3 class="text-xs font-medium text-gray-700 mb-1">API Documentation</h3>
                        <p class="text-xs text-gray-500">Markdown-formatted documentation for your API collection.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </nav>
        </div>
      </aside>

      {/* Markdown Modal - only for collections, not requests */}
      {selectedCollection && !selectedRequest && (
        <MarkdownModal
          key={`${selectedCollection.id}-${showMarkdownModal}`}
          isOpen={showMarkdownModal}
          onClose={() => setShowMarkdownModal(false)}
          onSave={handleEditDescription}
          initialMarkdown={selectedCollection.description || ''}
          title="Edit Collection Documentation"
          subtitle="Update the documentation for this collection using CommonMark Markdown."
        />
      )}
    </>
  );
}
