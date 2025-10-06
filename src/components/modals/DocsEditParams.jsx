import { useState, useEffect } from 'preact/hooks';
import { Modal } from '../common/Modal';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { EditorView } from '@codemirror/view';
import { bracketMatching } from '@codemirror/language';

/**
 * Converts internal parameters schema format to OpenAPI array format
 * Internal: { headers: {...}, query: {...}, path: {...} }
 * OpenAPI: [{ name: "...", in: "header", ... }, ...]
 */
function convertToOpenAPIFormat(parametersSchemaJson) {
  if (!parametersSchemaJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(parametersSchemaJson);
    const result = [];

    // Convert headers
    if (parsed.headers) {
      Object.entries(parsed.headers).forEach(([name, schema]) => {
        result.push({
          name,
          in: 'header',
          required: schema.required || false,
          description: schema.description || '',
          schema: {
            type: schema.type || 'string',
            ...schema
          }
        });
      });
    }

    // Convert query parameters
    if (parsed.query) {
      Object.entries(parsed.query).forEach(([name, schema]) => {
        result.push({
          name,
          in: 'query',
          required: schema.required || false,
          description: schema.description || '',
          schema: {
            type: schema.type || 'string',
            ...schema
          }
        });
      });
    }

    // Convert path parameters
    if (parsed.path) {
      Object.entries(parsed.path).forEach(([name, schema]) => {
        result.push({
          name,
          in: 'path',
          required: schema.required || false,
          description: schema.description || '',
          schema: {
            type: schema.type || 'string',
            ...schema
          }
        });
      });
    }

    return result;
  } catch (error) {
    console.error('Failed to convert to OpenAPI format:', error);
    return [];
  }
}

/**
 * Converts OpenAPI array format to internal parameters schema format
 * OpenAPI: [{ name: "...", in: "header", ... }, ...]
 * Internal: { headers: {...}, query: {...}, path: {...} }
 */
function convertFromOpenAPIFormat(openAPIArray) {
  const result = {
    headers: {},
    query: {},
    path: {}
  };

  openAPIArray.forEach(param => {
    const { name, in: location, schema, ...rest } = param;

    const paramSchema = {
      ...schema,
      ...rest
    };

    if (location === 'header') {
      result.headers[name] = paramSchema;
    } else if (location === 'query') {
      result.query[name] = paramSchema;
    } else if (location === 'path') {
      result.path[name] = paramSchema;
    }
  });

  return result;
}

/**
 * Validates OpenAPI parameters array
 */
function validateOpenAPIParameters(content) {
  if (!content.trim()) {
    return { isValid: true, error: null };
  }

  // Check if valid JSON
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    return { isValid: false, error: 'Invalid JSON' };
  }

  // Must be an array
  if (!Array.isArray(parsed)) {
    return { isValid: false, error: 'Must be an array' };
  }

  // Validate each parameter
  for (let i = 0; i < parsed.length; i++) {
    const param = parsed[i];

    // Must have "name" field
    if (!param.name || typeof param.name !== 'string') {
      return { isValid: false, error: `Parameter ${i + 1}: missing or invalid "name" field` };
    }

    // Must have "in" field with valid value
    if (!param.in) {
      return { isValid: false, error: `Parameter ${i + 1}: missing "in" field` };
    }

    const validLocations = ['header', 'query', 'path', 'cookie'];
    if (!validLocations.includes(param.in)) {
      return { isValid: false, error: `Parameter ${i + 1}: "in" must be one of: ${validLocations.join(', ')}` };
    }
  }

  return { isValid: true, error: null };
}

const BOILERPLATE_TEMPLATE = `[
  {
    "name": "parameter_name",
    "in": "query",
    "required": false,
    "description": "Parameter description",
    "schema": {
      "type": "string"
    }
  }
]`;

export function DocsEditParams({ isOpen, onClose, request, onSave }) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validation, setValidation] = useState({ isValid: true, error: null });

  // Initialize content when modal opens
  useEffect(() => {
    if (isOpen && request) {
      const openAPIArray = convertToOpenAPIFormat(request.parameters_schema);
      if (openAPIArray.length > 0) {
        setContent(JSON.stringify(openAPIArray, null, 2));
      } else {
        setContent('');
      }
      setError(null);
    }
  }, [isOpen, request]);

  // Validate content whenever it changes
  useEffect(() => {
    const result = validateOpenAPIParameters(content);
    setValidation(result);
  }, [content]);

  const handleSave = async () => {
    if (!request || !validation.isValid) return;

    setIsSaving(true);
    setError(null);

    try {
      let parametersSchemaJson = null;

      // Only process if content is not empty
      if (content.trim()) {
        // Parse and convert to internal format
        const openAPIArray = JSON.parse(content);
        const internalFormat = convertFromOpenAPIFormat(openAPIArray);
        parametersSchemaJson = JSON.stringify(internalFormat);
      }

      if (onSave) {
        await onSave({ parameters_schema: parametersSchemaJson });
      }

      onClose();
    } catch (err) {
      console.error('Failed to update parameters schema:', err);
      setError('Failed to update parameters schema. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setError(null);
      onClose();
    }
  };

  const handlePasteExample = () => {
    setContent(BOILERPLATE_TEMPLATE);
    setError(null);
  };

  const getCodeMirrorExtensions = () => {
    return [
      json(),
      bracketMatching(),
      EditorView.theme({
        "&": {
          minHeight: "168px",
        },
        ".cm-content, .cm-gutter": {
          minHeight: "168px !important"
        },
        ".cm-scroller": {
          overflow: "auto"
        }
      })
    ];
  };

  return (
    <Modal isOpen={isOpen && !!request} onClose={handleClose} title="Update parameters schema" size="xl">
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div class="mt-2">
          <p class="text-sm text-gray-500 mb-4">
            Basic JSON based editor of the OpenAPI parameters schema.
          </p>

          {/* Schema Editor */}
          <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-gray-700">OpenAPI parameters schema</label>

              {/* Schema validity indicator */}
              <div class="flex items-center text-xs">
                <span class="text-gray-600 mr-2">Schema validity:</span>
                {validation.isValid ? (
                  <span class="text-green-600 font-medium">Valid</span>
                ) : (
                  <span class="flex items-center text-red-500 font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
                    </svg>
                    Invalid
                  </span>
                )}
              </div>
            </div>

            <CodeMirror
              value={content}
              onChange={(value) => setContent(value)}
              placeholder="Enter OpenAPI parameters array"
              extensions={getCodeMirrorExtensions()}
              theme={dracula}
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
                border: '2px solid #282a36',
                borderRadius: '0.375rem',
                fontSize: '12px',
                fontFamily: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace'
              }}
            />

            {/* Paste example link */}
            <div class="mt-2 text-left">
              <button
                onClick={handlePasteExample}
                type="button"
                class="text-xs text-sky-600 hover:text-sky-700 cursor-pointer"
              >
                Paste example
              </button>
            </div>

            {/* Validation error message */}
            {!validation.isValid && validation.error && (
              <div class="flex items-center text-xs text-red-500 font-normal mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1 flex-shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                {validation.error}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div class="mt-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="submit"
            disabled={isSaving || !validation.isValid}
            class="inline-flex w-full justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 sm:ml-3 sm:w-auto cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Saving...</span>
              </div>
            ) : (
              'Save'
            )}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
