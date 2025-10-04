import { useState, useEffect, useRef } from 'preact/hooks';
import { MarkdownPreview } from '../common/MarkdownPreview';
import { MarkdownModal } from '../modals/MarkdownModal';
import { DocsDeleteAllModal } from '../modals/DocsDeleteAllModal';
import { DocsEditIntroModal } from '../modals/DocsEditIntroModal';
import { DocsEditParams } from '../modals/DocsEditParams';
import { DocsEditResponse } from '../modals/DocsEditResponse';
import { DocsEditRequest } from '../modals/DocsEditRequest';
import { ExampleViewer } from '../common/ExampleViewer';
import { SchemaViewer } from '../common/SchemaViewer';
import { Select } from '../common/Select';
import { ContextMenu } from '../common/ContextMenu';
import { useAppContext } from '../../hooks/useAppContext';
import { apiClient } from '../../api';
import { getMethodColor } from '../../utils/httpMethods';
import {
  parseRequestExamples,
  extractRequestExamplesFromSchema,
  extractResponseExamplesFromSchemas,
  getResponseStatusCodes,
  getStatusCodeDisplayName,
  getExampleContentType,
  getContentTypesForStatus,
  getContentTypeDisplayName
} from '../../utils/exampleParser';
import {
  parseParametersSchema,
  parseRequestBodySchema,
  parseResponseSchemas,
  getRequestBodyContentTypes,
  getRequestBodySchemaForContentType
} from '../../utils/schemaParser';

export function DocsSideBar({ onClose: _onClose }) {
  const { selectedCollection, selectedRequest, loadCollections } = useAppContext();
  const [showMarkdownModal, setShowMarkdownModal] = useState(false);
  const [showDeleteDocsModal, setShowDeleteDocsModal] = useState(false);
  const [showEditIntroModal, setShowEditIntroModal] = useState(false);
  const [showEditParamsModal, setShowEditParamsModal] = useState(false);
  const [showEditResponseModal, setShowEditResponseModal] = useState(false);
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showParamsContextMenu, setShowParamsContextMenu] = useState(false);
  const [showResponseContextMenu, setShowResponseContextMenu] = useState(false);
  const [showRequestBodyContextMenu, setShowRequestBodyContextMenu] = useState(false);
  const [showRequestExamplesContextMenu, setShowRequestExamplesContextMenu] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedResponseStatus, setSelectedResponseStatus] = useState('');
  const [selectedResponseContentType, setSelectedResponseContentType] = useState('');
  const [selectedResponseExample, setSelectedResponseExample] = useState('');
  const [selectedRequestBodyContentType, setSelectedRequestBodyContentType] = useState('');
  const [selectedRequestExampleContentType, setSelectedRequestExampleContentType] = useState('');
  const [selectedRequestExample, setSelectedRequestExample] = useState('');
  const [selectedTocSection, setSelectedTocSection] = useState('show-all');
  const menuTriggerRef = useRef();
  const paramsMenuTriggerRef = useRef();
  const responseMenuTriggerRef = useRef();
  const requestBodyMenuTriggerRef = useRef();
  const requestExamplesMenuTriggerRef = useRef();

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

  // Parse schema data when request changes
  const parametersSchema = selectedRequest ? parseParametersSchema(selectedRequest.parameters_schema) : null;
  const requestBodySchema = selectedRequest ? parseRequestBodySchema(selectedRequest.request_body_schema) : null;
  const requestBodyContentTypes = getRequestBodyContentTypes(requestBodySchema);

  // Extract request examples from request_body_schema
  const requestExamples = extractRequestExamplesFromSchema(requestBodySchema);

  // Extract response examples from response_schemas
  const responseSchemas = selectedRequest ? parseResponseSchemas(selectedRequest.response_schemas) : {};
  const responseExamples = extractResponseExamplesFromSchemas(responseSchemas);
  const responseStatusCodes = getResponseStatusCodes(responseExamples);

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

  // Handle content type selection when status changes
  useEffect(() => {
    if (!selectedResponseStatus) return;

    const contentTypes = getContentTypesForStatus(responseExamples, selectedResponseStatus);
    if (contentTypes.length > 0 && !selectedResponseContentType) {
      // Prefer JSON if available
      const preferredType = contentTypes.includes('application/json')
        ? 'application/json'
        : contentTypes[0];
      setSelectedResponseContentType(preferredType);
    }
    // Reset if selected content type is no longer available
    else if (selectedResponseContentType && !contentTypes.includes(selectedResponseContentType)) {
      const preferredType = contentTypes.includes('application/json')
        ? 'application/json'
        : (contentTypes[0] || '');
      setSelectedResponseContentType(preferredType);
    }
  }, [selectedResponseStatus, responseExamples, selectedResponseContentType]);

  // Handle example selection when content type changes
  useEffect(() => {
    if (!selectedResponseStatus || !selectedResponseContentType) return;

    const examples = responseExamples[selectedResponseStatus]?.[selectedResponseContentType] || [];
    if (examples.length > 0 && !selectedResponseExample) {
      setSelectedResponseExample(examples[0].name);
    }
    // Reset if selected example is no longer available
    else if (selectedResponseExample && !examples.find(ex => ex.name === selectedResponseExample)) {
      setSelectedResponseExample(examples[0]?.name || '');
    }
  }, [selectedResponseStatus, selectedResponseContentType, responseExamples, selectedResponseExample]);

  // Handle request body content type selection when data changes
  useEffect(() => {
    if (requestBodyContentTypes.length > 0 && !selectedRequestBodyContentType) {
      // Prefer JSON if available
      const preferredType = requestBodyContentTypes.includes('application/json')
        ? 'application/json'
        : requestBodyContentTypes[0];
      setSelectedRequestBodyContentType(preferredType);
    }
    // Reset if selected content type is no longer available
    else if (selectedRequestBodyContentType && !requestBodyContentTypes.includes(selectedRequestBodyContentType)) {
      const preferredType = requestBodyContentTypes.includes('application/json')
        ? 'application/json'
        : (requestBodyContentTypes[0] || '');
      setSelectedRequestBodyContentType(preferredType);
    }
  }, [requestBodyContentTypes, selectedRequestBodyContentType]);

  // Handle request example content type selection when data changes
  useEffect(() => {
    const contentTypes = Object.keys(requestExamples);
    if (contentTypes.length > 0 && !selectedRequestExampleContentType) {
      // Prefer JSON if available
      const preferredType = contentTypes.includes('application/json')
        ? 'application/json'
        : contentTypes[0];
      setSelectedRequestExampleContentType(preferredType);
    }
    // Reset if selected content type is no longer available
    else if (selectedRequestExampleContentType && !contentTypes.includes(selectedRequestExampleContentType)) {
      const preferredType = contentTypes.includes('application/json')
        ? 'application/json'
        : (contentTypes[0] || '');
      setSelectedRequestExampleContentType(preferredType);
    }
  }, [requestExamples, selectedRequestExampleContentType]);

  // Handle request example selection when content type changes
  useEffect(() => {
    if (!selectedRequestExampleContentType) return;

    const examples = requestExamples[selectedRequestExampleContentType] || [];
    if (examples.length > 0 && !selectedRequestExample) {
      setSelectedRequestExample(examples[0].name);
    }
    // Reset if selected example is no longer available
    else if (selectedRequestExample && !examples.find(ex => ex.name === selectedRequestExample)) {
      setSelectedRequestExample(examples[0]?.name || '');
    }
  }, [selectedRequestExampleContentType, requestExamples, selectedRequestExample]);

  // Reset all selections when request changes
  useEffect(() => {
    setSelectedResponseStatus('');
    setSelectedResponseContentType('');
    setSelectedResponseExample('');
    setSelectedRequestBodyContentType('');
    setSelectedRequestExampleContentType('');
    setSelectedRequestExample('');
    setSelectedTocSection('show-all');
    setShowContextMenu(false);
  }, [selectedRequest?.id]);

  const handleContextMenuClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu(true);
  };

  const handleDeleteDocs = async () => {
    await loadCollections();
  };

  const handleEditIntro = async (updates) => {
    if (!selectedRequest?.id) return;

    setIsUpdating(true);
    try {
      await apiClient.updateRequest(selectedRequest.id, updates);

      // Refresh collections to get updated data
      await loadCollections();
    } catch (error) {
      console.error('Failed to update request intro:', error);
      throw error; // Re-throw so modal can handle it
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveParams = async (updates) => {
    if (!selectedRequest?.id) return;

    setIsUpdating(true);
    try {
      await apiClient.updateRequest(selectedRequest.id, updates);

      // Refresh collections to get updated data
      await loadCollections();
    } catch (error) {
      console.error('Failed to update parameters schema:', error);
      throw error; // Re-throw so modal can handle it
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveResponse = async (updates) => {
    if (!selectedRequest?.id) return;

    setIsUpdating(true);
    try {
      await apiClient.updateRequest(selectedRequest.id, updates);

      // Refresh collections to get updated data
      await loadCollections();
    } catch (error) {
      console.error('Failed to update response schemas:', error);
      throw error; // Re-throw so modal can handle it
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveRequest = async (updates) => {
    if (!selectedRequest?.id) return;

    setIsUpdating(true);
    try {
      await apiClient.updateRequest(selectedRequest.id, updates);

      // Refresh collections to get updated data
      await loadCollections();
    } catch (error) {
      console.error('Failed to update request body schema:', error);
      throw error; // Re-throw so modal can handle it
    } finally {
      setIsUpdating(false);
    }
  };

  const contextMenuItems = [
    {
      label: 'Edit intro...',
      onClick: () => {
        setShowContextMenu(false);
        setShowEditIntroModal(true);
      },
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      label: 'Edit parameters...',
      onClick: () => {
        setShowContextMenu(false);
        setShowEditParamsModal(true);
      },
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      label: 'Edit response...',
      onClick: () => {
        setShowContextMenu(false);
        setShowEditResponseModal(true)
      },
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      divider: true
    },
    {
      label: 'Delete all...',
      onClick: () => {
        setShowContextMenu(false);
        setShowDeleteDocsModal(true);
      },
      destructive: true,
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )
    }
  ];

  const paramsContextMenuItems = [
    {
      label: 'Edit parameters...',
      onClick: () => {
        setShowParamsContextMenu(false);
        setShowEditParamsModal(true);
      },
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    }
  ];

  const responseContextMenuItems = [
    {
      label: 'Edit response...',
      onClick: () => {
        setShowResponseContextMenu(false);
        setShowEditResponseModal(true);
      },
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    }
  ];

  const requestBodyContextMenuItems = [
    {
      label: 'Edit request...',
      onClick: () => {
        setShowRequestBodyContextMenu(false);
        setShowEditRequestModal(true);
      },
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    }
  ];

  const requestExamplesContextMenuItems = [
    {
      label: 'Edit request...',
      onClick: () => {
        setShowRequestExamplesContextMenu(false);
        setShowEditRequestModal(true);
      },
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    }
  ];

  // Build table of contents sections
  const tocSections = [];
  if (selectedRequest?.description && selectedRequest.description.trim()) {
    tocSections.push({ id: 'description', label: 'Description' });
  }
  if (parametersSchema && (
    (parametersSchema.path && Object.keys(parametersSchema.path).length > 0) ||
    (parametersSchema.query && Object.keys(parametersSchema.query).length > 0) ||
    (parametersSchema.headers && Object.keys(parametersSchema.headers).length > 0)
  )) {
    tocSections.push({ id: 'parameters-schema', label: 'Parameters Schema' });
  }
  if (requestBodySchema) {
    tocSections.push({ id: 'request-body', label: 'Request Body Schema' });
  }
  if (Object.keys(requestExamples).length > 0) {
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
                <div class="flex items-center gap-2 justify-between">
                  <div class="flex items-center gap-2 flex-grow overflow-hidden">
                    <span class={`text-[10px]/[12px] text-white py-0.5 px-1 rounded flex-shrink-0 ${getMethodColor(selectedRequest.method)}`}>
                      {selectedRequest.method}
                    </span>
                    <h2 class="text-sm font-medium text-gray-900 truncate" title={selectedRequest.name || selectedRequest.url || 'Untitled Request'}>
                      {selectedRequest.name || selectedRequest.url || 'Untitled Request'}
                    </h2>
                  </div>

                  {/* Context Menu Trigger */}
                  <button
                    ref={menuTriggerRef}
                    onClick={handleContextMenuClick}
                    class="flex items-center text-sky-400 hover:text-sky-700 focus:outline-none cursor-pointer flex-shrink-0"
                    title="More options"
                  >
                    <span class="sr-only">Open options</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="flex-shrink-0">
                      <circle cx="5" cy="12" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="19" cy="12" r="2" />
                    </svg>
                  </button>
                </div>

                {/* Request Summary */}
                {selectedRequest.summary && selectedRequest.summary.trim() && (
                  <div class="text-sm text-gray-700">
                    {selectedRequest.summary}
                  </div>
                )}

                {/* Table of Contents */}
                {tocSections.length > 0 && (
                  <div class={`pb-4 border-b border-gray-200 ${selectedRequest.summary && selectedRequest.summary.trim() ? 'pt-3 border-t' : ''}`}>
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

                {/* Request Description */}
                {selectedRequest.description && selectedRequest.description.trim() && shouldShowSection('description') && (
                  <div>
                    <div class="text-left">
                      <MarkdownPreview markdown={selectedRequest.description} />
                    </div>
                  </div>
                )}

                {/* Request Documentation */}
                <div class="flex-1 min-h-0 space-y-4">
                  {/* Parameters Schema - filtered by TOC selection */}
                  {parametersSchema && shouldShowSection('parameters-schema') && (
                    <div id="parameters-schema">
                      <div class="flex items-center justify-between mb-2">
                        <label class="block text-xs font-medium text-gray-600">Parameters Schema</label>
                        <button
                          ref={paramsMenuTriggerRef}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowParamsContextMenu(true);
                          }}
                          class="flex items-center text-sky-400 hover:text-sky-700 focus:outline-none cursor-pointer"
                          title="More options"
                        >
                          <span class="sr-only">Open options</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="5" cy="12" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="19" cy="12" r="2" />
                          </svg>
                        </button>
                      </div>
                      <SchemaViewer
                        parametersSchema={parametersSchema}
                        requestBodySchema={null}
                        responseSchemas={{}}
                        showParametersTitle={false}
                      />
                    </div>
                  )}

                  {/* Request Body Schema */}
                  {requestBodySchema && shouldShowSection('request-body') && (() => {
                    const selectedSchema = getRequestBodySchemaForContentType(requestBodySchema, selectedRequestBodyContentType);

                    return (
                      <div id="request-body-schema" class="space-y-2">
                        <div class="flex items-center justify-between">
                          <label class="block text-xs font-medium text-gray-600">Request Body Schema</label>
                          <button
                            ref={requestBodyMenuTriggerRef}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowRequestBodyContextMenu(true);
                            }}
                            class="flex items-center text-sky-400 hover:text-sky-700 focus:outline-none cursor-pointer"
                            title="More options"
                          >
                            <span class="sr-only">Open options</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="5" cy="12" r="2" />
                              <circle cx="12" cy="12" r="2" />
                              <circle cx="19" cy="12" r="2" />
                            </svg>
                          </button>
                        </div>

                        {/* Content Type Selector */}
                        {requestBodyContentTypes.length > 1 && (
                          <div class="space-y-1">
                            <label class="block text-[10px] font-medium text-gray-500">Content Type</label>
                            <Select
                              value={selectedRequestBodyContentType}
                              onChange={setSelectedRequestBodyContentType}
                              options={requestBodyContentTypes.map(type => ({
                                value: type,
                                label: getContentTypeDisplayName(type)
                              }))}
                              placeholder="Select content type..."
                              size="small"
                            />
                          </div>
                        )}

                        {/* Display Selected Schema */}
                        {selectedSchema && (
                          <SchemaViewer
                            parametersSchema={null}
                            requestBodySchema={selectedSchema}
                            responseSchemas={{}}
                            showRequestBodyTitle={false}
                          />
                        )}
                      </div>
                    );
                  })()}

                  {/* Request Examples */}
                  {Object.keys(requestExamples).length > 0 && shouldShowSection('request-examples') && (() => {
                    const contentTypes = Object.keys(requestExamples);
                    const examples = requestExamples[selectedRequestExampleContentType] || [];
                    const selectedExample = examples.find(ex => ex.name === selectedRequestExample);

                    return (
                      <div id="request-examples" class="space-y-2">
                        <div class="flex items-center justify-between">
                          <label class="block text-xs font-medium text-gray-600">Request Examples</label>
                          <button
                            ref={requestExamplesMenuTriggerRef}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowRequestExamplesContextMenu(true);
                            }}
                            class="flex items-center text-sky-400 hover:text-sky-700 focus:outline-none cursor-pointer"
                            title="More options"
                          >
                            <span class="sr-only">Open options</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="5" cy="12" r="2" />
                              <circle cx="12" cy="12" r="2" />
                              <circle cx="19" cy="12" r="2" />
                            </svg>
                          </button>
                        </div>

                        {/* Content Type Selector */}
                        {contentTypes.length > 1 && (
                          <div class="space-y-1">
                            <label class="block text-[10px] font-medium text-gray-500">Content Type</label>
                            <Select
                              value={selectedRequestExampleContentType}
                              onChange={setSelectedRequestExampleContentType}
                              options={contentTypes.map(type => ({
                                value: type,
                                label: getContentTypeDisplayName(type)
                              }))}
                              placeholder="Select content type..."
                              size="small"
                            />
                          </div>
                        )}

                        {/* Example Selector */}
                        {examples.length > 1 && (
                          <div class="space-y-1">
                            <label class="block text-[10px] font-medium text-gray-500">Example</label>
                            <Select
                              value={selectedRequestExample}
                              onChange={setSelectedRequestExample}
                              options={examples.map(ex => ({
                                value: ex.name,
                                label: ex.summary || ex.name
                              }))}
                              placeholder="Select example..."
                              size="small"
                            />
                          </div>
                        )}

                        {/* Display Selected Example */}
                        {selectedExample && (
                          <ExampleViewer
                            examples={[selectedExample]}
                            title={contentTypes.length === 1 && examples.length === 1 ? "Request Example" : ""}
                            contentType={selectedRequestExampleContentType || 'application/json'}
                          />
                        )}
                      </div>
                    );
                  })()}

                  {/* Response Schema */}
                  {Object.keys(responseSchemas).length > 0 && shouldShowSection('response-schema') && (
                    <div id="response-schema">
                      <div class="flex items-center justify-between mb-2">
                        <label class="block text-xs font-medium text-gray-600">Response Schemas</label>
                        <button
                          ref={responseMenuTriggerRef}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowResponseContextMenu(true);
                          }}
                          class="flex items-center text-sky-400 hover:text-sky-700 focus:outline-none cursor-pointer"
                          title="More options"
                        >
                          <span class="sr-only">Open options</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="5" cy="12" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="19" cy="12" r="2" />
                          </svg>
                        </button>
                      </div>
                      <SchemaViewer
                        parametersSchema={null}
                        requestBodySchema={null}
                        responseSchemas={responseSchemas}
                        showResponseTitle={false}
                      />
                    </div>
                  )}

                  {/* Response Examples */}
                  {responseStatusCodes.length > 0 && shouldShowSection('response-examples') && (() => {
                    const contentTypes = getContentTypesForStatus(responseExamples, selectedResponseStatus);
                    const examples = responseExamples[selectedResponseStatus]?.[selectedResponseContentType] || [];
                    const selectedExample = examples.find(ex => ex.name === selectedResponseExample);

                    return (
                      <div id="response-examples" class="space-y-2">
                        <div class="flex items-center justify-between">
                          <label class="block text-xs font-medium text-gray-600">Response Examples</label>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowResponseContextMenu(true);
                            }}
                            class="flex items-center text-sky-400 hover:text-sky-700 focus:outline-none cursor-pointer"
                            title="More options"
                          >
                            <span class="sr-only">Open options</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="5" cy="12" r="2" />
                              <circle cx="12" cy="12" r="2" />
                              <circle cx="19" cy="12" r="2" />
                            </svg>
                          </button>
                        </div>

                        {/* Status Code Selector */}
                        {responseStatusCodes.length > 1 && (
                          <div class="space-y-1">
                            <label class="block text-[10px] font-medium text-gray-500">Status Code</label>
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
                          </div>
                        )}

                        {/* Content Type Selector */}
                        {contentTypes.length > 1 && (
                          <div class="space-y-1">
                            <label class="block text-[10px] font-medium text-gray-500">Content Type</label>
                            <Select
                              value={selectedResponseContentType}
                              onChange={setSelectedResponseContentType}
                              options={contentTypes.map(type => ({
                                value: type,
                                label: getContentTypeDisplayName(type)
                              }))}
                              placeholder="Select content type..."
                              size="small"
                            />
                          </div>
                        )}

                        {/* Example Name Selector */}
                        {examples.length > 1 && (
                          <div class="space-y-1">
                            <label class="block text-[10px] font-medium text-gray-500">Example</label>
                            <Select
                              value={selectedResponseExample}
                              onChange={setSelectedResponseExample}
                              options={examples.map(ex => ({
                                value: ex.name,
                                label: ex.summary || ex.name
                              }))}
                              placeholder="Select example..."
                              size="small"
                            />
                          </div>
                        )}

                        {/* Display Selected Example */}
                        {selectedExample && (
                          <ExampleViewer
                            examples={[selectedExample]}
                            title={responseStatusCodes.length === 1 && contentTypes.length === 1 && examples.length === 1
                              ? getStatusCodeDisplayName(selectedResponseStatus)
                              : ""}
                            contentType={selectedResponseContentType || 'application/json'}
                          />
                        )}
                      </div>
                    );
                  })()}

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

      {/* Context Menu - only for requests */}
      {selectedRequest && (
        <ContextMenu
          isOpen={showContextMenu}
          onClose={() => setShowContextMenu(false)}
          trigger={menuTriggerRef.current}
          items={contextMenuItems}
        />
      )}

      {/* Delete Documentation Modal - only for requests */}
      {showDeleteDocsModal && (
        <DocsDeleteAllModal
          isOpen={showDeleteDocsModal}
          onClose={() => setShowDeleteDocsModal(false)}
          request={selectedRequest}
          onDelete={handleDeleteDocs}
        />
      )}

      {/* Edit Intro Modal - only for requests */}
      {showEditIntroModal && (
        <DocsEditIntroModal
          isOpen={showEditIntroModal}
          onClose={() => setShowEditIntroModal(false)}
          request={selectedRequest}
          onSave={handleEditIntro}
        />
      )}

      {/* Edit Parameters Modal - only for requests */}
      {showEditParamsModal && (
        <DocsEditParams
          isOpen={showEditParamsModal}
          onClose={() => setShowEditParamsModal(false)}
          request={selectedRequest}
          onSave={handleSaveParams}
        />
      )}

      {/* Parameters Schema Context Menu - only for requests */}
      {selectedRequest && (
        <ContextMenu
          isOpen={showParamsContextMenu}
          onClose={() => setShowParamsContextMenu(false)}
          trigger={paramsMenuTriggerRef.current}
          items={paramsContextMenuItems}
        />
      )}

      {/* Response Context Menu - only for requests */}
      {selectedRequest && (
        <ContextMenu
          isOpen={showResponseContextMenu}
          onClose={() => setShowResponseContextMenu(false)}
          trigger={responseMenuTriggerRef.current}
          items={responseContextMenuItems}
        />
      )}

      {/* Edit Response Modal - only for requests */}
      {showEditResponseModal && (
        <DocsEditResponse
          isOpen={showEditResponseModal}
          onClose={() => setShowEditResponseModal(false)}
          request={selectedRequest}
          onSave={handleSaveResponse}
        />
      )}

      {/* Request Body Context Menu - only for requests */}
      {selectedRequest && (
        <ContextMenu
          isOpen={showRequestBodyContextMenu}
          onClose={() => setShowRequestBodyContextMenu(false)}
          trigger={requestBodyMenuTriggerRef.current}
          items={requestBodyContextMenuItems}
        />
      )}

      {/* Request Examples Context Menu - only for requests */}
      {selectedRequest && (
        <ContextMenu
          isOpen={showRequestExamplesContextMenu}
          onClose={() => setShowRequestExamplesContextMenu(false)}
          trigger={requestExamplesMenuTriggerRef.current}
          items={requestExamplesContextMenuItems}
        />
      )}

      {/* Edit Request Modal - only for requests */}
      {showEditRequestModal && (
        <DocsEditRequest
          isOpen={showEditRequestModal}
          onClose={() => setShowEditRequestModal(false)}
          request={selectedRequest}
          onSave={handleSaveRequest}
        />
      )}

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
