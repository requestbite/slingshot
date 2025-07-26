import { useState, useEffect, useRef } from 'preact/hooks';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { EditorView, keymap } from '@codemirror/view';
import { autocompletion, CompletionContext } from '@codemirror/autocomplete';
import { bracketMatching, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { Prec } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import { tags } from '@lezer/highlight';
import { ContextMenu } from '../../common/ContextMenu';
import { VariableInput } from '../../common/VariableInput';
import { useAppContext } from '../../../hooks/useAppContext';
import { apiClient } from '../../../api';

const BODY_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'raw', label: 'Raw' },
  { value: 'form-data', label: 'multipart/form-data' },
  { value: 'url-encoded', label: 'x-www-form-urlencoded' }
];

const CONTENT_TYPES = [
  { value: 'application/json', label: 'JSON' },
  { value: 'application/xml', label: 'XML' },
  { value: 'text/plain', label: 'Text' }
];

// FormDataSection component for both form-data and url-encoded data
function FormDataSection({ data, onDataChange, onEnterKeyPress, title, allowFiles = true }) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuTrigger, setContextMenuTrigger] = useState(null);
  const addButtonRef = useRef();

  const menuItems = [
    {
      label: 'Text',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14,2 14,8 20,8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      ),
      onClick: () => addField('text')
    },
    {
      label: 'File',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14,2 14,8 20,8" />
        </svg>
      ),
      onClick: () => addField('file')
    }
  ];

  const handleAddButtonClick = () => {
    if (allowFiles) {
      setContextMenuTrigger(addButtonRef.current);
      setShowContextMenu(true);
    } else {
      // Directly add text field for URL-encoded (no files supported)
      addField('text');
    }
  };

  const addField = (type) => {
    const newField = {
      id: crypto.randomUUID(),
      key: '',
      value: type === 'file' ? null : '',
      type: type,
      enabled: true
    };
    onDataChange([...data, newField]);
  };

  const removeField = (id) => {
    onDataChange(data.filter(field => field.id !== id));
  };

  const updateField = (id, field, value) => {
    const updatedFields = data.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onDataChange(updatedFields);
  };

  const toggleFieldEnabled = (id) => {
    const updatedFields = data.map(item =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    onDataChange(updatedFields);
  };

  const renderValueField = (field) => {
    if (field.type === 'file') {
      return (
        <input
          key={`${field.type}-value-${field.id}`}
          type="file"
          onChange={(e) => {
            const file = e.target.files[0];
            updateField(field.id, 'value', file);
          }}
          class={`w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-sky-500 focus:border-sky-500 ${field.enabled ? 'bg-white' : 'bg-gray-50 text-gray-500'
            }`}
          disabled={!field.enabled}
        />
      );
    } else {
      return (
        <VariableInput
          key={`${field.type}-value-${field.id}`}
          value={field.value || ''}
          onChange={(value) => updateField(field.id, 'value', value)}
          onKeyDown={onEnterKeyPress}
          placeholder="Value"
          className={`w-full text-sm ${
            field.enabled ? '' : 'opacity-50'
          }`}
          disabled={!field.enabled}
        />
      );
    }
  };

  return (
    <div class="form-request-content">
      <div class="flex justify-between items-center mb-2">
        <button
          ref={addButtonRef}
          onClick={handleAddButtonClick}
          class="px-3 py-1 bg-sky-100 hover:bg-sky-200 text-sky-700 text-sm font-medium rounded-md cursor-pointer flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus-icon lucide-plus">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          Add
        </button>
      </div>

      {allowFiles && (
        <ContextMenu
          isOpen={showContextMenu}
          onClose={() => setShowContextMenu(false)}
          trigger={contextMenuTrigger}
          items={menuItems}
        />
      )}

      <div class="space-y-2">
        {data.map((field) => (
          <div key={field.id} class="grid grid-cols-12 gap-2 items-center">
            <div class="col-span-1 flex justify-center">
              <input
                type="checkbox"
                checked={field.enabled}
                onChange={() => toggleFieldEnabled(field.id)}
                class="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
              />
            </div>
            {allowFiles && (
              <div class="col-span-1 flex justify-center">
                <span class={`text-xs px-2 py-1 rounded ${field.type === 'file'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                  }`}>
                  {field.type === 'file' ? 'File' : 'Text'}
                </span>
              </div>
            )}
            <div class={allowFiles ? "col-span-4" : "col-span-5"}>
              <VariableInput
                key={`${field.type}-key-${field.id}`}
                value={field.key}
                onChange={(value) => updateField(field.id, 'key', value)}
                onKeyDown={onEnterKeyPress}
                placeholder="Key"
                className={`w-full text-sm ${
                  field.enabled ? '' : 'opacity-50'
                }`}
                disabled={!field.enabled}
              />
            </div>
            <div class="col-span-5">
              {renderValueField(field)}
            </div>
            <div class="col-span-1 flex justify-center">
              <button
                onClick={() => removeField(field.id)}
                class="p-1 text-red-400 hover:text-red-600 transition-all cursor-pointer"
                title="Remove field"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BodyTab({
  bodyType,
  bodyContent,
  contentType,
  method,
  formData = [],
  urlEncodedData = [],
  onBodyTypeChange,
  onBodyContentChange,
  onContentTypeChange,
  onFormDataChange,
  onUrlEncodedDataChange,
  onEnterKeyPress,
  onSendRequest
}) {
  const { selectedCollection } = useAppContext();
  const [availableVariables, setAvailableVariables] = useState(new Map());
  const isBodyDisabled = ['GET', 'HEAD', 'OPTIONS'].includes(method);

  // JSON validation state
  const [isValidJson, setIsValidJson] = useState(true);

  // Load available variables
  useEffect(() => {
    const loadVariables = async () => {
      const variables = new Map();

      try {
        // Collection variables (inline)
        if (selectedCollection?.variables) {
          selectedCollection.variables.forEach(v => variables.set(v.key, v.value));
        }

        // Database collection variables
        if (selectedCollection?.id) {
          const collectionVars = await apiClient.getSecretsByCollection(selectedCollection.id);
          collectionVars.forEach(v => variables.set(v.key, v.value));
        }

        // Environment variables (if collection has environment)
        if (selectedCollection?.environment_id) {
          const envVars = await apiClient.getSecretsByEnvironment(selectedCollection.environment_id);
          envVars.forEach(v => variables.set(v.key, v.value));
        }
      } catch (error) {
        console.error('Failed to load variables:', error);
      }

      setAvailableVariables(variables);
    };

    loadVariables();
  }, [selectedCollection]);

  // Validate JSON when content type changes to JSON
  useEffect(() => {
    if (contentType === 'application/json') {
      validateJson(bodyContent);
    } else {
      setIsValidJson(true);
    }
  }, [contentType, bodyContent]);

  // Validate JSON on content change
  const validateJson = (content) => {
    if (!content.trim()) {
      setIsValidJson(true);
      return true;
    }

    try {
      JSON.parse(content);
      setIsValidJson(true);
      return true;
    } catch (error) {
      setIsValidJson(false);
      return false;
    }
  };

  // Handle body content change with JSON validation
  const handleBodyContentChange = (value) => {
    onBodyContentChange(value);

    // Only validate JSON if content type is JSON
    if (contentType === 'application/json') {
      validateJson(value);
    } else {
      setIsValidJson(true);
    }
  };

  // Prettify JSON function
  const prettifyJson = () => {
    if (contentType === 'application/json' && bodyContent && isValidJson) {
      try {
        const parsed = JSON.parse(bodyContent);
        const prettified = JSON.stringify(parsed, null, 2);
        onBodyContentChange(prettified);
      } catch (error) {
        console.error('Failed to prettify JSON:', error);
      }
    }
  };

  // Variable completion source
  const variableCompletionSource = (context) => {
    const { state, pos } = context;
    const line = state.doc.lineAt(pos);
    const lineText = line.text;
    const lineStart = line.from;
    const cursorInLine = pos - lineStart;
    
    // Look for {{ pattern before cursor
    const beforeCursor = lineText.substring(0, cursorInLine);
    const match = beforeCursor.match(/\{\{([^}]*)$/);
    
    if (!match) return null;
    
    const matchStart = lineStart + match.index;
    const currentWord = match[1];
    
    // Get variable keys and filter based on current input
    const variableKeys = Array.from(availableVariables.keys());
    const filtered = currentWord 
      ? variableKeys.filter(key => key.toLowerCase().startsWith(currentWord.toLowerCase()))
      : variableKeys;
    
    if (filtered.length === 0) return null;
    
    return {
      from: matchStart,
      options: filtered.map(key => ({
        label: `{{${key}}}`,
        detail: `Variable: ${availableVariables.get(key) || ''}`,
        type: 'variable'
      }))
    };
  };

  // Variable highlighting decoration
  const variableHighlightEffect = StateEffect.define();
  
  const variableHighlightField = StateField.define({
    create() {
      return Decoration.none;
    },
    update(decorations, tr) {
      decorations = decorations.map(tr.changes);
      
      for (let effect of tr.effects) {
        if (effect.is(variableHighlightEffect)) {
          decorations = effect.value;
        }
      }
      
      return decorations;
    },
    provide: f => EditorView.decorations.from(f)
  });

  // Create variable decorations
  const createVariableDecorations = (view) => {
    const decorations = [];
    const doc = view.state.doc;
    const text = doc.toString();
    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const variableName = match[1];
      const isValid = availableVariables.has(variableName);
      const className = isValid ? 'cm-variable-valid' : 'cm-variable-invalid';
      
      const from = match.index;
      const to = match.index + match[0].length;
      
      decorations.push(
        Decoration.mark({
          class: className,
          attributes: {
            title: isValid ? `${variableName}: ${availableVariables.get(variableName)}` : `Unknown variable: ${variableName}`
          }
        }).range(from, to)
      );
    }
    
    return Decoration.set(decorations);
  };

  // Update decorations when content or variables change
  const updateVariableHighlighting = (view) => {
    if (!view) return;
    const decorations = createVariableDecorations(view);
    view.dispatch({
      effects: variableHighlightEffect.of(decorations)
    });
  };

  // Get CodeMirror extensions based on content type
  const getCodeMirrorExtensions = (contentType) => {
    const sendRequestKeymap = keymap.of([
      {
        key: 'Ctrl-Enter',
        preventDefault: true,
        run: (view) => {
          console.log('Ctrl+Enter pressed in CodeMirror');
          if (onSendRequest) {
            console.log('Calling onSendRequest');
            onSendRequest();
            return true;
          }
          console.log('onSendRequest not available');
          return false;
        }
      },
      {
        key: 'Cmd-Enter',
        preventDefault: true,
        run: (view) => {
          console.log('Cmd+Enter pressed in CodeMirror');
          if (onSendRequest) {
            console.log('Calling onSendRequest');
            onSendRequest();
            return true;
          }
          console.log('onSendRequest not available');
          return false;
        }
      }
    ]);

    const baseExtensions = [
      // Add Ctrl/Cmd+Enter keymap for sending requests with high precedence
      Prec.highest(sendRequestKeymap),
      bracketMatching(),
      autocompletion({
        override: [variableCompletionSource],
        activateOnTyping: true,
        closeOnBlur: true
      }),
      variableHighlightField,
      // Custom theme for variable highlighting and auto-completion
      EditorView.theme({
        "&": {
          minHeight: "168px",
        },
        ".cm-content, .cm-gutter": {
          minHeight: "168px !important"
        },
        ".cm-scroller": {
          overflow: "auto"
        },
        // Variable highlighting - matching VariableInput component
        ".cm-variable-valid": {
          backgroundColor: "#dcfce7",
          color: "#166534",
          fontWeight: "500",
          borderRadius: "3px",
          padding: "1px 3px"
        },
        ".cm-variable-invalid": {
          backgroundColor: "#fef2f2",
          color: "#dc2626",
          fontWeight: "500",
          borderRadius: "3px",
          padding: "1px 3px"
        },
        // Auto-completion dropdown styling - matching VariableInput component
        ".cm-tooltip.cm-tooltip-autocomplete": {
          backgroundColor: "white",
          border: "1px solid #d1d5db",
          borderRadius: "6px",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          maxHeight: "192px",
          fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: "14px"
        },
        ".cm-tooltip.cm-tooltip-autocomplete > ul": {
          maxHeight: "192px",
          margin: "0",
          padding: "0"
        },
        ".cm-completionLabel": {
          fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: "14px",
          fontWeight: "500"
        },
        ".cm-completionDetail": {
          fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: "12px",
          color: "#6b7280",
          fontStyle: "normal"
        },
        ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
          padding: "8px 12px",
          color: "#374151",
          cursor: "pointer",
          borderBottom: "none"
        },
        ".cm-tooltip.cm-tooltip-autocomplete > ul > li:hover": {
          backgroundColor: "#f3f4f6",
          color: "#374151"
        },
        ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
          backgroundColor: "#f0f9ff",
          color: "#0c4a6e"
        }
      }),
      // Update decorations on document changes
      EditorView.updateListener.of((update) => {
        if (update.docChanged || update.viewportChanged) {
          // Debounce decoration updates
          setTimeout(() => updateVariableHighlighting(update.view), 50);
        }
      })
    ];

    switch (contentType) {
      case 'application/json':
        return [...baseExtensions, json()];
      case 'application/xml':
        return [...baseExtensions, xml()];
      case 'text/plain':
      default:
        return baseExtensions;
    }
  };


  return (
    <>
      {/* Request Type Toggle */}
      <div class="mb-2 overflow-x-auto scrollbar-hide">
        <div class="flex items-center flex-nowrap min-w-max">
          {BODY_TYPES.map(type => (
            <label key={type.value} class="inline-flex items-center mr-4 whitespace-nowrap">
              <input
                type="radio"
                name="requestType"
                value={type.value}
                checked={bodyType === type.value}
                onChange={(e) => onBodyTypeChange(e.target.value)}
                class="h-4 w-4 text-sky-600"
                disabled={isBodyDisabled && type.value !== 'none'}
              />
              <span class="ml-2">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Content Type Select and Controls */}
      {bodyType === 'raw' && (
        <div class="flex items-center justify-between w-full mb-2">
          <div class="flex items-center space-x-2">
            <div class="relative w-32">
              <select
                value={contentType}
                onChange={(e) => onContentTypeChange(e.target.value)}
                class="w-full appearance-none rounded-md bg-white py-1 pl-3 pr-8 text-xs text-gray-900 outline -outline-offset-1 outline-gray-300 focus:outline focus:-outline-offset-2 focus:outline-sky-500"
              >
                {CONTENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <svg class="pointer-events-none absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 h-3 w-3"
                viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" data-slot="icon">
                <path fill-rule="evenodd"
                  d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                  clip-rule="evenodd" />
              </svg>
            </div>

            {/* Prettify Button - only show for JSON content type */}
            {contentType === 'application/json' && (
              <button
                onClick={prettifyJson}
                disabled={!isValidJson || !bodyContent.trim()}
                class={`px-2 py-1 text-xs font-medium rounded-md cursor-pointer ${isValidJson && bodyContent.trim()
                    ? 'bg-sky-100 hover:bg-sky-200 text-sky-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
              >
                Prettify
              </button>
            )}

            {/* Invalid JSON indicator */}
            {contentType === 'application/json' && !isValidJson && bodyContent.trim() && (
              <span class="flex items-center text-xs text-red-500 font-normal">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info-icon lucide-info mr-1">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                Invalid JSON.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Raw Body Content */}
      {bodyType === 'raw' && (
        <div class="mb-2">
          <CodeMirror
            value={bodyContent}
            onChange={(value, viewUpdate) => {
              handleBodyContentChange(value);
              // Update variable highlighting after content change
              if (viewUpdate?.view) {
                setTimeout(() => updateVariableHighlighting(viewUpdate.view), 100);
              }
            }}
            placeholder="Enter request body"
            extensions={getCodeMirrorExtensions(contentType)}
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
              border: '1px solid #44475a',
              borderRadius: '0.375rem',
              fontSize: '12px',
              fontFamily: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace'
            }}
          />
          
          {/* Variable hint indicator */}
          {availableVariables.size > 0 && (
            <span class="flex items-center text-xs text-gray-400 font-normal whitespace-nowrap overflow-hidden mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info-icon lucide-info mr-1 flex-shrink-0">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
              To insert a variable, type {"\"{{\"" + " followed by Ctrl+Space (or Cmd+Space on Mac)"}
            </span>
          )}
        </div>
      )}

      {/* Form Data Content */}
      {bodyType === 'form-data' && (
        <FormDataSection
          data={formData}
          onDataChange={onFormDataChange}
          onEnterKeyPress={onEnterKeyPress}
          title="Form Data"
          allowFiles={true}
        />
      )}

      {/* URL-Encoded Data Content */}
      {bodyType === 'url-encoded' && (
        <FormDataSection
          data={urlEncodedData}
          onDataChange={onUrlEncodedDataChange}
          onEnterKeyPress={onEnterKeyPress}
          title="URL-Encoded Data"
          allowFiles={false}
        />
      )}
    </>
  );
}
