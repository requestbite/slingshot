import { useState, useEffect, useRef } from 'preact/hooks';
import { MarkdownPreview } from '../common/MarkdownPreview';
import { DocsEditCol } from '../modals/DocsEditCol';
import { DocsDeleteAllModal } from '../modals/DocsDeleteAllModal';
import { DocsDeleteCol } from '../modals/DocsDeleteCol';
import { DocsDeleteAllDocsModal } from '../modals/DocsDeleteAllDocsModal';
import { DocsEditIntroModal } from '../modals/DocsEditIntroModal';
import { DocsEditParams } from '../modals/DocsEditParams';
import { DocsEditResponse } from '../modals/DocsEditResponse';
import { DocsEditRequest } from '../modals/DocsEditRequest';
import { DocsEditAuth } from '../modals/DocsEditAuth';
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
  const [showDeleteColDocsModal, setShowDeleteColDocsModal] = useState(false);
  const [showDeleteAllDocsModal, setShowDeleteAllDocsModal] = useState(false);
  const [showEditIntroModal, setShowEditIntroModal] = useState(false);
  const [showEditParamsModal, setShowEditParamsModal] = useState(false);
  const [showEditResponseModal, setShowEditResponseModal] = useState(false);
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showParamsContextMenu, setShowParamsContextMenu] = useState(false);
  const [showResponseContextMenu, setShowResponseContextMenu] = useState(false);
  const [showRequestBodyContextMenu, setShowRequestBodyContextMenu] = useState(false);
  const [showRequestExamplesContextMenu, setShowRequestExamplesContextMenu] = useState(false);
  const [showCollectionContextMenu, setShowCollectionContextMenu] = useState(false);
  const [showAuthContextMenu, setShowAuthContextMenu] = useState(false);
  const [showEditAuthModal, setShowEditAuthModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedResponseStatus, setSelectedResponseStatus] = useState('');
  const [selectedResponseContentType, setSelectedResponseContentType] = useState('');
  const [selectedResponseExample, setSelectedResponseExample] = useState('');
  const [selectedRequestBodyContentType, setSelectedRequestBodyContentType] = useState('');
  const [selectedRequestExampleContentType, setSelectedRequestExampleContentType] = useState('');
  const [selectedRequestExample, setSelectedRequestExample] = useState('');
  const [selectedTocSection, setSelectedTocSection] = useState('show-all');
  const [selectedAuthScheme, setSelectedAuthScheme] = useState('');
  const menuTriggerRef = useRef();
  const paramsMenuTriggerRef = useRef();
  const responseMenuTriggerRef = useRef();
  const requestBodyMenuTriggerRef = useRef();
  const requestExamplesMenuTriggerRef = useRef();
  const collectionMenuTriggerRef = useRef();
  const authMenuTriggerRef = useRef();

  const handleEditDescription = async (updates) => {
    if (!selectedCollection?.id) return;

    setIsUpdating(true);
    try {
      await apiClient.updateCollection(selectedCollection.id, {
        name: updates.name,
        description: updates.markdown
      });

      // Refresh collections to get updated data
      await loadCollections();
    } catch (error) {
      console.error('Failed to update collection:', error);
      throw error; // Re-throw so modal can handle it
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

  // Handle auth scheme selection when collection changes
  useEffect(() => {
    if (selectedCollection?.security_schemes) {
      const schemeNames = Object.keys(selectedCollection.security_schemes);
      if (schemeNames.length > 0 && !selectedAuthScheme) {
        setSelectedAuthScheme(schemeNames[0]);
      }
      // Reset if selected scheme is no longer available
      else if (selectedAuthScheme && !schemeNames.includes(selectedAuthScheme)) {
        setSelectedAuthScheme(schemeNames[0] || '');
      }
    } else {
      setSelectedAuthScheme('');
    }
  }, [selectedCollection?.security_schemes, selectedAuthScheme]);

  const handleContextMenuClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu(true);
  };

  const handleDeleteDocs = async () => {
    await loadCollections();
  };

  const handleDeleteColDocs = async () => {
    await loadCollections();
  };

  const handleDeleteAllDocs = async () => {
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

  const handleSaveAuth = async (updates) => {
    if (!selectedCollection?.id) return;

    setIsUpdating(true);
    try {
      await apiClient.updateCollection(selectedCollection.id, updates);

      // Refresh collections to get updated data
      await loadCollections();
    } catch (error) {
      console.error('Failed to update security schemes:', error);
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
      label: 'Edit request...',
      onClick: () => {
        setShowContextMenu(false);
        setShowEditRequestModal(true);
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
      label: 'Delete docs...',
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

  const collectionContextMenuItems = [
    {
      label: 'Edit intro...',
      onClick: () => {
        setShowCollectionContextMenu(false);
        setShowMarkdownModal(true);
      },
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      label: 'Edit auth...',
      onClick: () => {
        setShowCollectionContextMenu(false);
        setShowEditAuthModal(true);
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
      label: 'Delete intro docs...',
      onClick: () => {
        setShowCollectionContextMenu(false);
        setShowDeleteColDocsModal(true);
      },
      destructive: true,
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )
    },
    {
      label: 'Delete all docs...',
      onClick: () => {
        setShowCollectionContextMenu(false);
        setShowDeleteAllDocsModal(true);
      },
      destructive: true,
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )
    }
  ];

  const authContextMenuItems = [
    {
      label: 'Edit auth...',
      onClick: () => {
        setShowAuthContextMenu(false);
        setShowEditAuthModal(true);
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
                    <div class="text-left pb-4 border-b border-gray-200">
                      <MarkdownPreview markdown={selectedRequest.description} />
                    </div>
                  </div>
                )}

                {/* Request Documentation */}
                <div class="flex-1 min-h-0 space-y-4">
                  {/* Parameters Schema - filtered by TOC selection */}
                  {parametersSchema && (
                    (parametersSchema.path && Object.keys(parametersSchema.path).length > 0) ||
                    (parametersSchema.query && Object.keys(parametersSchema.query).length > 0) ||
                    (parametersSchema.headers && Object.keys(parametersSchema.headers).length > 0)
                  ) && shouldShowSection('parameters-schema') && (
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
                <div class="flex items-center gap-2 justify-between">
                  <h2 class="text-sm font-medium text-gray-900 truncate flex-grow overflow-hidden" title={selectedCollection.name}>
                    {selectedCollection.name}
                  </h2>

                  {/* Context Menu Trigger */}
                  <button
                    ref={collectionMenuTriggerRef}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowCollectionContextMenu(true);
                    }}
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

                {/* Collection Documentation */}
                <div class="flex-1 min-h-0">
                  {selectedCollection.description && selectedCollection.description.trim() ? (
                    <div class="text-left pb-4 border-b border-gray-200">
                      <MarkdownPreview markdown={selectedCollection.description} />
                    </div>
                  ) : ''}
                </div>

                {/* Authorization Section */}
                {selectedCollection.security_schemes && Object.keys(selectedCollection.security_schemes).length > 0 && (() => {
                  const schemeNames = Object.keys(selectedCollection.security_schemes);
                  const selectedScheme = selectedCollection.security_schemes[selectedAuthScheme];

                  const renderAuthDetails = (scheme) => {
                    if (!scheme) return null;

                    const details = [];

                    // API Key
                    if (scheme.type === 'apiKey') {
                      details.push(
                        <div key="type" class="space-y-1">
                          <label class="block text-[10px] font-medium text-gray-500">Type</label>
                          <div class="text-xs text-gray-700">API Key</div>
                        </div>
                      );
                      details.push(
                        <div key="in" class="space-y-1">
                          <label class="block text-[10px] font-medium text-gray-500">Location</label>
                          <div class="text-xs text-gray-700">{scheme.in}</div>
                        </div>
                      );
                      details.push(
                        <div key="name" class="space-y-1">
                          <label class="block text-[10px] font-medium text-gray-500">Parameter Name</label>
                          <div class="text-xs text-gray-700">{scheme.name}</div>
                        </div>
                      );
                    }

                    // HTTP (Basic, Bearer, etc.)
                    else if (scheme.type === 'http') {
                      details.push(
                        <div key="type" class="space-y-1">
                          <label class="block text-[10px] font-medium text-gray-500">Type</label>
                          <div class="text-xs text-gray-700">HTTP</div>
                        </div>
                      );
                      details.push(
                        <div key="scheme" class="space-y-1">
                          <label class="block text-[10px] font-medium text-gray-500">Scheme</label>
                          <div class="text-xs text-gray-700">{scheme.scheme}</div>
                        </div>
                      );
                      if (scheme.bearerFormat) {
                        details.push(
                          <div key="bearerFormat" class="space-y-1">
                            <label class="block text-[10px] font-medium text-gray-500">Bearer Format</label>
                            <div class="text-xs text-gray-700">{scheme.bearerFormat}</div>
                          </div>
                        );
                      }
                    }

                    // OAuth2
                    else if (scheme.type === 'oauth2' && scheme.flows) {
                      details.push(
                        <div key="type" class="space-y-1">
                          <label class="block text-[10px] font-medium text-gray-500">Type</label>
                          <div class="text-xs text-gray-700">OAuth 2.0</div>
                        </div>
                      );

                      // Iterate through flows (implicit, password, clientCredentials, authorizationCode)
                      Object.entries(scheme.flows).forEach(([flowType, flowData]) => {
                        details.push(
                          <div key={`flow-${flowType}`} class="space-y-1">
                            <label class="block text-[10px] font-medium text-gray-500">Flow Type</label>
                            <div class="text-xs text-gray-700">{flowType}</div>
                          </div>
                        );

                        if (flowData.authorizationUrl) {
                          details.push(
                            <div key={`auth-url-${flowType}`} class="space-y-1">
                              <label class="block text-[10px] font-medium text-gray-500">Authorization URL</label>
                              <div class="text-xs text-gray-700 break-all">{flowData.authorizationUrl}</div>
                            </div>
                          );
                        }

                        if (flowData.tokenUrl) {
                          details.push(
                            <div key={`token-url-${flowType}`} class="space-y-1">
                              <label class="block text-[10px] font-medium text-gray-500">Token URL</label>
                              <div class="text-xs text-gray-700 break-all">{flowData.tokenUrl}</div>
                            </div>
                          );
                        }

                        if (flowData.refreshUrl) {
                          details.push(
                            <div key={`refresh-url-${flowType}`} class="space-y-1">
                              <label class="block text-[10px] font-medium text-gray-500">Refresh URL</label>
                              <div class="text-xs text-gray-700 break-all">{flowData.refreshUrl}</div>
                            </div>
                          );
                        }

                        if (flowData.scopes && Object.keys(flowData.scopes).length > 0) {
                          details.push(
                            <div key={`scopes-${flowType}`} class="space-y-1">
                              <label class="block text-[10px] font-medium text-gray-500">Scopes</label>
                              <div class="text-xs text-gray-700">
                                {Object.entries(flowData.scopes).map(([scope, description]) => (
                                  <div key={scope} class="ml-2 mb-2">
                                    <span class="font-medium">{scope}</span>
                                    {description && <span class="text-gray-500"> - {description}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                      });
                    }

                    // OpenID Connect
                    else if (scheme.type === 'openIdConnect') {
                      details.push(
                        <div key="type" class="space-y-1">
                          <label class="block text-[10px] font-medium text-gray-500">Type</label>
                          <div class="text-xs text-gray-700">OpenID Connect</div>
                        </div>
                      );
                      details.push(
                        <div key="url" class="space-y-1">
                          <label class="block text-[10px] font-medium text-gray-500">OpenID Connect URL</label>
                          <div class="text-xs text-gray-700 break-all">{scheme.openIdConnectUrl}</div>
                        </div>
                      );
                    }

                    // Mutual TLS
                    else if (scheme.type === 'mutualTLS') {
                      details.push(
                        <div key="type" class="space-y-1">
                          <label class="block text-[10px] font-medium text-gray-500">Type</label>
                          <div class="text-xs text-gray-700">Mutual TLS</div>
                        </div>
                      );
                    }

                    // Description (if present)
                    if (scheme.description) {
                      details.push(
                        <div key="description" class="space-y-1">
                          <label class="block text-[10px] font-medium text-gray-500">Description</label>
                          <div class="text-xs text-gray-700">{scheme.description}</div>
                        </div>
                      );
                    }

                    return details;
                  };

                  return (
                    <div class="space-y-3">
                      <div class="flex items-center justify-between">
                        <label class="block text-xs font-medium text-gray-600">Authorization</label>
                        <button
                          ref={authMenuTriggerRef}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowAuthContextMenu(true);
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

                      {/* Auth Scheme Selector */}
                      {schemeNames.length > 1 && (
                        <div class="space-y-1">
                          <label class="block text-[10px] font-medium text-gray-500">Auth Mechanism</label>
                          <Select
                            value={selectedAuthScheme}
                            onChange={setSelectedAuthScheme}
                            options={schemeNames.map(name => ({
                              value: name,
                              label: name
                            }))}
                            placeholder="Select auth mechanism..."
                            size="small"
                          />
                        </div>
                      )}

                      {/* Auth Details */}
                      <div class="space-y-3">
                        {renderAuthDetails(selectedScheme)}
                      </div>
                    </div>
                  );
                })()}
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

      {/* Collection Context Menu - only for collections */}
      {selectedCollection && !selectedRequest && (
        <ContextMenu
          isOpen={showCollectionContextMenu}
          onClose={() => setShowCollectionContextMenu(false)}
          trigger={collectionMenuTriggerRef.current}
          width={230}
          items={collectionContextMenuItems}
        />
      )}

      {/* Collection Documentation Editor - only for collections, not requests */}
      {selectedCollection && !selectedRequest && (
        <DocsEditCol
          key={`${selectedCollection.id}-${showMarkdownModal}`}
          isOpen={showMarkdownModal}
          onClose={() => setShowMarkdownModal(false)}
          onSave={handleEditDescription}
          initialName={selectedCollection.name || ''}
          initialMarkdown={selectedCollection.description || ''}
          title="Edit Collection Documentation"
          subtitle="Update the documentation for this collection using CommonMark Markdown."
        />
      )}

      {/* Auth Context Menu - only for collections with security schemes */}
      {selectedCollection && !selectedRequest && selectedCollection.security_schemes && (
        <ContextMenu
          isOpen={showAuthContextMenu}
          onClose={() => setShowAuthContextMenu(false)}
          trigger={authMenuTriggerRef.current}
          items={authContextMenuItems}
        />
      )}

      {/* Edit Auth Modal - only for collections */}
      {showEditAuthModal && selectedCollection && !selectedRequest && (
        <DocsEditAuth
          isOpen={showEditAuthModal}
          onClose={() => setShowEditAuthModal(false)}
          collection={selectedCollection}
          onSave={handleSaveAuth}
        />
      )}

      {/* Delete Collection Documentation Modal - only for collections */}
      {showDeleteColDocsModal && selectedCollection && !selectedRequest && (
        <DocsDeleteCol
          isOpen={showDeleteColDocsModal}
          onClose={() => setShowDeleteColDocsModal(false)}
          collection={selectedCollection}
          onDelete={handleDeleteColDocs}
        />
      )}

      {/* Delete All Documentation Modal - only for collections */}
      {showDeleteAllDocsModal && selectedCollection && !selectedRequest && (
        <DocsDeleteAllDocsModal
          isOpen={showDeleteAllDocsModal}
          onClose={() => setShowDeleteAllDocsModal(false)}
          collection={selectedCollection}
          onDelete={handleDeleteAllDocs}
        />
      )}
    </>
  );
}
