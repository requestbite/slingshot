import { useState, useEffect } from 'preact/hooks';
import { Modal } from '../common/Modal';
import { Label } from '../common/Label';
import { Button } from '../common/Button';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { EditorView } from '@codemirror/view';
import { bracketMatching } from '@codemirror/language';

/**
 * Validates OpenAPI responses object
 */
function validateOpenAPIResponses(content) {
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
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { isValid: false, error: 'Must be an object with status codes as keys' };
  }

  // Validate each status code
  for (const [statusCode, response] of Object.entries(parsed)) {
    // Validate status code format (3-digit number or 'default')
    if (statusCode !== 'default' && !/^\d{3}$/.test(statusCode)) {
      return { isValid: false, error: `Invalid status code: "${statusCode}". Must be a 3-digit number or "default"` };
    }

    // Response must be an object
    if (typeof response !== 'object' || Array.isArray(response)) {
      return { isValid: false, error: `Response for status ${statusCode}: must be an object` };
    }

    // Validate headers if present
    if (response.headers !== undefined) {
      if (typeof response.headers !== 'object' || Array.isArray(response.headers)) {
        return { isValid: false, error: `Response for status ${statusCode}: "headers" must be an object` };
      }

      for (const [headerName, headerDef] of Object.entries(response.headers)) {
        if (typeof headerDef !== 'object' || Array.isArray(headerDef)) {
          return { isValid: false, error: `Response for status ${statusCode}, header "${headerName}": must be an object` };
        }
      }
    }

    // Validate content if present
    if (response.content !== undefined) {
      if (typeof response.content !== 'object' || Array.isArray(response.content)) {
        return { isValid: false, error: `Response for status ${statusCode}: "content" must be an object` };
      }

      for (const [contentType, mediaType] of Object.entries(response.content)) {
        if (typeof mediaType !== 'object' || Array.isArray(mediaType)) {
          return { isValid: false, error: `Response for status ${statusCode}, content type "${contentType}": must be an object` };
        }

        // Validate examples if present
        if (mediaType.examples !== undefined) {
          if (typeof mediaType.examples !== 'object' || Array.isArray(mediaType.examples)) {
            return { isValid: false, error: `Response for status ${statusCode}, content type "${contentType}": "examples" must be an object` };
          }

          for (const [exampleName, exampleDef] of Object.entries(mediaType.examples)) {
            if (typeof exampleDef !== 'object' || Array.isArray(exampleDef)) {
              return { isValid: false, error: `Response for status ${statusCode}, content type "${contentType}", example "${exampleName}": must be an object` };
            }
          }
        }
      }
    }
  }

  return { isValid: true, error: null };
}

const BOILERPLATE_TEMPLATE = `{
  "200": {
    "description": "Success",
    "headers": {},
    "content": {
      "application/json": {
        "schema": {
          "type": "object",
          "properties": {}
        },
        "examples": {
          "example1": {
            "summary": "Example response",
            "description": "",
            "value": {}
          }
        }
      }
    }
  }
}`;

export function DocsEditResponse({ isOpen, onClose, request, onSave }) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validation, setValidation] = useState({ isValid: true, error: null });

  // Initialize content when modal opens
  useEffect(() => {
    if (isOpen && request) {
      if (request.response_schemas) {
        // Parse and pretty-print the existing response schemas
        try {
          const parsed = JSON.parse(request.response_schemas);
          setContent(JSON.stringify(parsed, null, 2));
        } catch (err) {
          console.error('Failed to parse response_schemas:', err);
          setContent('');
        }
      } else {
        setContent('');
      }
      setError(null);

      // Auto-focus on CodeMirror editor
      setTimeout(() => {
        const editors = document.querySelectorAll('.cm-content');
        if (editors.length > 0) {
          // Focus the last one (most recently added)
          const editor = editors[editors.length - 1];
          editor.focus();
        }
      }, 150);
    }
  }, [isOpen, request]);

  // Validate content whenever it changes
  useEffect(() => {
    const result = validateOpenAPIResponses(content);
    setValidation(result);
  }, [content]);

  const handleSave = async () => {
    if (!request || !validation.isValid) return;

    setIsSaving(true);
    setError(null);

    try {
      // Parse the content - validation already confirmed it's valid
      const responseSchemasJson = content.trim() ? content : null;

      if (onSave) {
        await onSave({ response_schemas: responseSchemasJson });
      }

      onClose();
    } catch (err) {
      console.error('Failed to update response schemas:', err);
      setError('Failed to update response schemas. Please try again.');
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
    <Modal isOpen={isOpen && !!request} onClose={handleClose} title="Update response schema" size="xl">
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div class="mt-2">
          <p class="text-sm text-gray-500 dark:text-neutral-dark-500 mb-4 text-center sm:text-left">
            Basic JSON based editor of the OpenAPI response schema and examples.
          </p>

          {/* Schema Editor */}
          <div class="mb-4">
            <div class="flex items-center justify-between">
              <Label>OpenAPI response schema</Label>

              {/* Schema validity indicator */}
              <div class="flex items-center text-xs">
                <span class="text-gray-600 dark:text-neutral-dark-600 mr-2">Schema:</span>
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
              placeholder="Enter OpenAPI responses object"
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
              <Button
                onClick={handlePasteExample}
                type="button"
                variant="link"
                className="text-xs"
              >
                Paste example
              </Button>
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
          <Button
            type="submit"
            disabled={isSaving || !validation.isValid}
            loading={isSaving}
            variant="primary"
            className="w-full sm:ml-3 sm:w-auto"
          >
            Save
          </Button>
          <Button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            variant="secondary"
            className="mt-3 w-full sm:mt-0 sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
