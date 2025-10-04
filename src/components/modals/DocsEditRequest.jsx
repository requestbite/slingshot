import { useState, useEffect } from 'preact/hooks';
import { Modal } from '../common/Modal';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { EditorView } from '@codemirror/view';
import { bracketMatching } from '@codemirror/language';

/**
 * Validates OpenAPI request body structure
 */
function validateOpenAPIRequestBody(content) {
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

  // Must be an object
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { isValid: false, error: 'Must be an object' };
  }

  // Must have "content" field
  if (!parsed.content || typeof parsed.content !== 'object') {
    return { isValid: false, error: 'Missing or invalid "content" field' };
  }

  // Validate each content type
  for (const [contentType, contentData] of Object.entries(parsed.content)) {
    if (!contentData || typeof contentData !== 'object') {
      return { isValid: false, error: `Content type "${contentType}": must be an object` };
    }

    // Schema is optional but if present must be an object
    if (contentData.schema !== undefined && (typeof contentData.schema !== 'object' || contentData.schema === null)) {
      return { isValid: false, error: `Content type "${contentType}": schema must be an object` };
    }

    // Examples is optional but if present must be an object
    if (contentData.examples !== undefined) {
      if (typeof contentData.examples !== 'object' || Array.isArray(contentData.examples)) {
        return { isValid: false, error: `Content type "${contentType}": examples must be an object` };
      }

      // Validate each example
      for (const [exampleName, exampleData] of Object.entries(contentData.examples)) {
        if (!exampleData || typeof exampleData !== 'object') {
          return { isValid: false, error: `Content type "${contentType}", example "${exampleName}": must be an object` };
        }
        // Examples should have a "value" field
        if (!('value' in exampleData)) {
          return { isValid: false, error: `Content type "${contentType}", example "${exampleName}": missing "value" field` };
        }
      }
    }
  }

  return { isValid: true, error: null };
}

const BOILERPLATE_TEMPLATE = `{
  "content": {
    "application/json": {
      "schema": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "Name field"
          },
          "age": {
            "type": "integer",
            "description": "Age field"
          }
        },
        "required": ["name"]
      },
      "examples": {
        "example1": {
          "summary": "Example request",
          "description": "An example request payload",
          "value": {
            "name": "John Doe",
            "age": 30
          }
        }
      }
    }
  }
}`;

export function DocsEditRequest({ isOpen, onClose, request, onSave }) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validation, setValidation] = useState({ isValid: true, error: null });

  // Initialize content when modal opens
  useEffect(() => {
    if (isOpen && request) {
      if (request.request_body_schema) {
        try {
          const parsed = JSON.parse(request.request_body_schema);
          setContent(JSON.stringify(parsed, null, 2));
        } catch (err) {
          console.error('Failed to parse request body schema:', err);
          setContent(BOILERPLATE_TEMPLATE);
        }
      } else {
        setContent(BOILERPLATE_TEMPLATE);
      }
      setError(null);
    }
  }, [isOpen, request]);

  // Validate content whenever it changes
  useEffect(() => {
    const result = validateOpenAPIRequestBody(content);
    setValidation(result);
  }, [content]);

  const handleSave = async () => {
    if (!request || !validation.isValid) return;

    setIsSaving(true);
    setError(null);

    try {
      // Parse and save
      const parsed = JSON.parse(content);
      const requestBodySchemaJson = JSON.stringify(parsed);

      if (onSave) {
        await onSave({ request_body_schema: requestBodySchemaJson });
      }

      onClose();
    } catch (err) {
      console.error('Failed to update request body schema:', err);
      setError('Failed to update request body schema. Please try again.');
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
    <Modal isOpen={isOpen && !!request} onClose={handleClose} title="Update request body schema" size="xl">
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div class="mt-2">
          <p class="text-sm text-gray-500 mb-4">
            Basic JSON based update of OpenAPI request body schema and examples.
          </p>

          {/* Schema Editor */}
          <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-gray-700">Valid OpenAPI request body schema</label>

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
              placeholder="Enter OpenAPI request body object"
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
