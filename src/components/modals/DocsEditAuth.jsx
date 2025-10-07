import { useState, useEffect } from 'preact/hooks';
import { Modal } from '../common/Modal';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { EditorView } from '@codemirror/view';
import { bracketMatching } from '@codemirror/language';

/**
 * Validates OpenAPI 3.0 security schemes object
 */
function validateSecuritySchemes(content) {
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
  if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
    return { isValid: false, error: 'Must be an object (not an array)' };
  }

  // Validate each security scheme
  const schemeNames = Object.keys(parsed);
  for (let i = 0; i < schemeNames.length; i++) {
    const schemeName = schemeNames[i];
    const scheme = parsed[schemeName];

    // Must be an object
    if (typeof scheme !== 'object' || Array.isArray(scheme) || scheme === null) {
      return { isValid: false, error: `Security scheme "${schemeName}": must be an object` };
    }

    // Must have "type" field
    if (!scheme.type || typeof scheme.type !== 'string') {
      return { isValid: false, error: `Security scheme "${schemeName}": missing or invalid "type" field` };
    }

    // Validate type
    const validTypes = ['apiKey', 'http', 'oauth2', 'openIdConnect', 'mutualTLS'];
    if (!validTypes.includes(scheme.type)) {
      return { isValid: false, error: `Security scheme "${schemeName}": "type" must be one of: ${validTypes.join(', ')}` };
    }

    // Type-specific validation
    switch (scheme.type) {
      case 'apiKey':
        if (!scheme.name || typeof scheme.name !== 'string') {
          return { isValid: false, error: `Security scheme "${schemeName}": apiKey type requires "name" field` };
        }
        if (!scheme.in || typeof scheme.in !== 'string') {
          return { isValid: false, error: `Security scheme "${schemeName}": apiKey type requires "in" field` };
        }
        const validLocations = ['query', 'header', 'cookie'];
        if (!validLocations.includes(scheme.in)) {
          return { isValid: false, error: `Security scheme "${schemeName}": "in" must be one of: ${validLocations.join(', ')}` };
        }
        break;

      case 'http':
        if (!scheme.scheme || typeof scheme.scheme !== 'string') {
          return { isValid: false, error: `Security scheme "${schemeName}": http type requires "scheme" field` };
        }
        break;

      case 'oauth2':
        if (!scheme.flows || typeof scheme.flows !== 'object' || Array.isArray(scheme.flows)) {
          return { isValid: false, error: `Security scheme "${schemeName}": oauth2 type requires "flows" object` };
        }
        // Validate flow types
        const validFlows = ['implicit', 'password', 'clientCredentials', 'authorizationCode'];
        const flowKeys = Object.keys(scheme.flows);
        for (const flowKey of flowKeys) {
          if (!validFlows.includes(flowKey)) {
            return { isValid: false, error: `Security scheme "${schemeName}": invalid flow type "${flowKey}". Must be one of: ${validFlows.join(', ')}` };
          }
        }
        break;

      case 'openIdConnect':
        if (!scheme.openIdConnectUrl || typeof scheme.openIdConnectUrl !== 'string') {
          return { isValid: false, error: `Security scheme "${schemeName}": openIdConnect type requires "openIdConnectUrl" field` };
        }
        break;

      case 'mutualTLS':
        // mutualTLS has no additional required fields
        break;
    }
  }

  return { isValid: true, error: null };
}

const BOILERPLATE_TEMPLATE = `{
  "bearerAuth": {
    "type": "http",
    "scheme": "bearer",
    "bearerFormat": "JWT",
    "description": "Bearer token authentication"
  },
  "apiKey": {
    "type": "apiKey",
    "in": "header",
    "name": "X-API-Key",
    "description": "API key authentication"
  }
}`;

export function DocsEditAuth({ isOpen, onClose, collection, onSave }) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validation, setValidation] = useState({ isValid: true, error: null });

  // Initialize content when modal opens
  useEffect(() => {
    if (isOpen && collection) {
      if (collection.security_schemes && Object.keys(collection.security_schemes).length > 0) {
        setContent(JSON.stringify(collection.security_schemes, null, 2));
      } else {
        setContent('');
      }
      setError(null);
    }
  }, [isOpen, collection]);

  // Validate content whenever it changes
  useEffect(() => {
    const result = validateSecuritySchemes(content);
    setValidation(result);
  }, [content]);

  const handleSave = async () => {
    if (!collection || !validation.isValid) return;

    setIsSaving(true);
    setError(null);

    try {
      // Parse the security schemes
      const securitySchemes = content.trim() ? JSON.parse(content) : null;

      if (onSave) {
        await onSave({ security_schemes: securitySchemes });
      }

      onClose();
    } catch (err) {
      console.error('Failed to update security schemes:', err);
      setError('Failed to update security schemes. Please try again.');
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
    <Modal isOpen={isOpen && !!collection} onClose={handleClose} title="Update authorization schemes" size="xl">
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div class="mt-2">
          <p class="text-sm text-gray-500 mb-4 text-center sm:text-left">
            Basic JSON based editor of the OpenAPI security schemes.
          </p>

          {/* Schema Editor */}
          <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-gray-700">OpenAPI security schemes</label>

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
              placeholder="Enter OpenAPI security schemes object"
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
