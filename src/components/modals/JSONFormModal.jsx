import { useState, useEffect } from 'preact/hooks';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TextInput } from '../common/TextInput';
import { Label } from '../common/Label';
import { Select } from '../common/Select';
import { MarkdownPreview } from '../common/MarkdownPreview';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { EditorView } from '@codemirror/view';
import { bracketMatching } from '@codemirror/language';
import {
  detectSchemaComposition,
  getCompositionDisplayName,
  getSchemaOptionDisplayName
} from '../../utils/schemaParser';

/**
 * JSONFormModal Component
 *
 * A modal that renders a form based on a JSON schema.
 * Uses the provided JSON schema to dynamically generate form fields
 * that the user can fill out.
 */
export function JSONFormModal({ isOpen, onClose, onImport, jsonSchema }) {
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [compositionSelections, setCompositionSelections] = useState({});
  const [enabledFields, setEnabledFields] = useState({});

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && jsonSchema) {
      // Initialize form with default values from schema
      const initialData = initializeFormData(jsonSchema);
      setFormData(initialData);
      setError(null);
      // Initialize composition selections (default to index 0)
      const initialSelections = {};
      // Initialize enabled fields (required fields are enabled by default)
      const initialEnabled = {};
      if (jsonSchema.properties) {
        Object.entries(jsonSchema.properties).forEach(([fieldName, property]) => {
          const composition = detectSchemaComposition(property);
          if (composition.hasComposition) {
            initialSelections[fieldName] = 0;
          }
          // Required fields are enabled by default (but can be disabled)
          const isRequired = jsonSchema.required?.includes(fieldName);
          initialEnabled[fieldName] = isRequired;
        });
      }
      setCompositionSelections(initialSelections);
      setEnabledFields(initialEnabled);

      // Auto-focus on first form field
      setTimeout(() => {
        // Try to focus first input, textarea, select, or CodeMirror editor
        const firstInput = document.querySelector('input[type="text"], input[type="number"], input[type="email"], input[type="url"], input[type="date"], input[type="datetime-local"], textarea, select, .cm-content');
        if (firstInput) {
          firstInput.focus();
        }
      }, 150);
    }
  }, [isOpen, jsonSchema]);

  /**
   * Initialize form data with default values from JSON schema
   */
  const initializeFormData = (schema) => {
    if (!schema || !schema.properties) return {};

    const data = {};
    Object.entries(schema.properties).forEach(([key, prop]) => {
      // Check for composition (anyOf, oneOf, allOf) and use first option
      const composition = detectSchemaComposition(prop);
      const effectiveProp = composition.hasComposition
        ? composition.options[0] || {}
        : prop;

      if (effectiveProp.default !== undefined) {
        data[key] = effectiveProp.default;
      } else if (effectiveProp.type === 'string') {
        data[key] = '';
      } else if (effectiveProp.type === 'number' || effectiveProp.type === 'integer') {
        data[key] = '';
      } else if (effectiveProp.type === 'boolean') {
        data[key] = false;
      } else if (effectiveProp.type === 'array') {
        // Initialize array as empty JSON string for CodeMirror
        data[key] = '[]';
      } else if (effectiveProp.type === 'object') {
        // Initialize object as empty JSON string for CodeMirror
        data[key] = '{}';
      } else if (effectiveProp.type === 'null') {
        data[key] = null;
      } else {
        data[key] = '';
      }
    });
    return data;
  };

  /**
   * Validate form data against JSON schema
   * Note: Validation is disabled to allow flexible payload creation
   */
  const validateForm = () => {
    // Allow any form data to be submitted
    return true;
  };

  /**
   * Handle form field changes
   */
  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  /**
   * Handle field enable/disable toggle
   */
  const handleFieldToggle = (fieldName, enabled) => {
    setEnabledFields(prev => ({
      ...prev,
      [fieldName]: enabled
    }));
  };

  /**
   * Convert form data to proper types based on schema
   */
  const convertFormData = (data) => {
    if (!jsonSchema || !jsonSchema.properties) return data;

    const converted = {};
    Object.entries(jsonSchema.properties).forEach(([key, prop]) => {
      const value = data[key];
      const isEnabled = enabledFields[key];

      // Skip disabled fields
      if (!isEnabled) {
        return;
      }

      // Check for composition and get effective property
      const composition = detectSchemaComposition(prop);
      const selectedIndex = compositionSelections[key] || 0;
      const effectiveProp = composition.hasComposition
        ? composition.options[selectedIndex] || {}
        : prop;

      // Convert types
      if (effectiveProp.type === 'number' || effectiveProp.type === 'integer') {
        converted[key] = value === '' ? 0 : Number(value);
      } else if (effectiveProp.type === 'boolean') {
        converted[key] = Boolean(value);
      } else if (effectiveProp.type === 'null') {
        converted[key] = null;
      } else if (effectiveProp.type === 'object') {
        // If it's a string (JSON), try to parse it
        if (typeof value === 'string') {
          try {
            converted[key] = JSON.parse(value);
          } catch (e) {
            // If parsing fails, use empty object
            converted[key] = {};
          }
        } else if (typeof value === 'object') {
          // Already an object, keep as-is
          converted[key] = value;
        }
      } else if (effectiveProp.type === 'array') {
        // If it's a string (JSON), try to parse it
        if (typeof value === 'string') {
          try {
            converted[key] = JSON.parse(value);
          } catch (e) {
            // If parsing fails, use empty array
            converted[key] = [];
          }
        } else if (Array.isArray(value)) {
          // Already an array, keep as-is
          converted[key] = value;
        }
      } else {
        // String or other types - keep as-is (including empty strings)
        converted[key] = value;
      }
    });

    return converted;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const convertedData = convertFormData(formData);

      if (onImport) {
        await onImport(convertedData);
      }

      onClose();
    } catch (error) {
      console.error('Failed to import data:', error);
      setError('Failed to import data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      setFormData({});
      onClose();
    }
  };

  /**
   * Handle composition selection change
   */
  const handleCompositionChange = (fieldName, selectedIndex) => {
    setCompositionSelections(prev => ({
      ...prev,
      [fieldName]: selectedIndex
    }));

    // Clear the field value when switching composition options
    setFormData(prev => ({
      ...prev,
      [fieldName]: ''
    }));
  };

  /**
   * Render a form field based on JSON schema property
   */
  const renderField = (fieldName, property) => {
    const isRequired = jsonSchema.required?.includes(fieldName) || false;
    const fieldValue = formData[fieldName] || '';
    const isEnabled = enabledFields[fieldName] || false;

    // Check for composition (anyOf, oneOf, allOf)
    const composition = detectSchemaComposition(property);
    const selectedCompositionIndex = compositionSelections[fieldName] || 0;
    const effectiveProperty = composition.hasComposition
      ? composition.options[selectedCompositionIndex] || {}
      : property;

    /**
     * Render parent field description (for composition fields)
     * This is shown directly under the field label
     */
    const renderParentDescription = () => {
      if (!composition.hasComposition) return null;
      if (!property.description) return null;

      return (
        <div class="mt-1 mb-2 text-xs text-gray-500 [&_.prose]:text-xs [&_.prose]:text-gray-500 [&_.prose_p]:text-gray-500 [&_.prose_li]:text-gray-500 [&_.prose_*]:text-gray-500">
          <MarkdownPreview markdown={property.description} />
        </div>
      );
    };

    /**
     * Render effective property description (for composition options)
     * This is shown below the input field
     */
    const renderEffectiveDescription = () => {
      // For composition fields, only show the effective property description
      // The parent description is shown above via renderParentDescription
      if (composition.hasComposition) {
        if (!effectiveProperty.description) return null;
        return (
          <div class="mt-1 text-xs text-gray-500 [&_.prose]:text-xs [&_.prose]:text-gray-500 [&_.prose_p]:text-gray-500 [&_.prose_li]:text-gray-500 [&_.prose_*]:text-gray-500">
            <MarkdownPreview markdown={effectiveProperty.description} />
          </div>
        );
      }

      // For non-composition fields, show the property description
      const description = property.description;
      if (!description) return null;
      return (
        <div class="mt-1 text-xs text-gray-500 [&_.prose]:text-xs [&_.prose]:text-gray-500 [&_.prose_p]:text-gray-500 [&_.prose_li]:text-gray-500 [&_.prose_*]:text-gray-500">
          <MarkdownPreview markdown={description} />
        </div>
      );
    };

    /**
     * Render field label with enable checkbox
     */
    const renderFieldLabel = (htmlFor) => {
      return (
        <div class="flex items-center justify-between mb-1">
          <Label htmlFor={htmlFor} mandatory={isRequired} className="mb-0">
            {property.title || fieldName}
          </Label>
          <div class="flex items-center gap-1">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => handleFieldToggle(fieldName, e.target.checked)}
              class="h-3 w-3 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
            />
            <span class="text-xs text-gray-600">
              Enable
            </span>
          </div>
        </div>
      );
    };

    // Render composition selector if applicable
    const renderCompositionSelector = () => {
      if (!composition.hasComposition) return null;

      const options = composition.options.map((option, index) => ({
        value: index.toString(),
        label: getSchemaOptionDisplayName(option, index)
      }));

      return (
        <div class="mb-2">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-gray-600">{getCompositionDisplayName(composition.type)}:</span>
            <Select
              value={selectedCompositionIndex.toString()}
              onChange={(value) => handleCompositionChange(fieldName, parseInt(value, 10))}
              options={options}
              size="small"
              className="min-w-0 flex-1"
            />
          </div>
        </div>
      );
    };

    // Handle null type - render a simple disabled message
    if (effectiveProperty.type === 'null') {
      return (
        <div key={fieldName} class="mb-4">
          {renderFieldLabel(fieldName)}
          {renderParentDescription()}
          {renderCompositionSelector()}
          <div class={`text-xs text-gray-500 italic p-2 bg-gray-50 rounded border border-gray-200 ${!isEnabled ? 'opacity-50' : ''}`}>
            Field is set to null
          </div>
          {renderEffectiveDescription()}
        </div>
      );
    }

    // Determine input type based on schema type
    let inputType = 'text';
    if (effectiveProperty.type === 'number' || effectiveProperty.type === 'integer') {
      inputType = 'number';
    } else if (effectiveProperty.format === 'email') {
      inputType = 'email';
    } else if (effectiveProperty.format === 'uri') {
      inputType = 'url';
    } else if (effectiveProperty.format === 'date') {
      inputType = 'date';
    } else if (effectiveProperty.format === 'date-time') {
      inputType = 'datetime-local';
    }

    // Use textarea for long text
    if (effectiveProperty.type === 'string' && effectiveProperty.maxLength && effectiveProperty.maxLength > 100) {
      inputType = 'textarea';
    }

    // Render checkbox for boolean
    if (effectiveProperty.type === 'boolean') {
      return (
        <div key={fieldName} class="mb-4">
          {renderFieldLabel(fieldName)}
          {renderParentDescription()}
          {renderCompositionSelector()}
          <div class={`flex items-center ${!isEnabled ? 'opacity-50' : ''}`}>
            <input
              id={fieldName}
              type="checkbox"
              checked={fieldValue}
              onChange={(e) => handleFieldChange(fieldName, e.target.checked)}
              disabled={isSubmitting || !isEnabled}
              class="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
            />
            <span class="ml-2 text-sm text-gray-700">
              Enabled
            </span>
          </div>
          {renderEffectiveDescription()}
        </div>
      );
    }

    // Render select for enum
    if (effectiveProperty.enum && Array.isArray(effectiveProperty.enum)) {
      const enumOptions = [
        { value: '', label: 'Select an option' },
        ...effectiveProperty.enum.map(option => ({
          value: option,
          label: option
        }))
      ];

      return (
        <div key={fieldName} class="mb-4">
          {renderFieldLabel(fieldName)}
          {renderParentDescription()}
          {renderCompositionSelector()}
          <div class={!isEnabled ? 'opacity-50' : ''}>
            <Select
              id={fieldName}
              value={fieldValue}
              onChange={(value) => handleFieldChange(fieldName, value)}
              options={enumOptions}
              disabled={isSubmitting || !isEnabled}
            />
          </div>
          {renderEffectiveDescription()}
        </div>
      );
    }

    // Render CodeMirror for object type
    if (effectiveProperty.type === 'object') {
      // Convert object to JSON string for display
      const objectValue = typeof fieldValue === 'object'
        ? JSON.stringify(fieldValue, null, 2)
        : fieldValue;

      return (
        <div key={fieldName} class="mb-4">
          {renderFieldLabel(fieldName)}
          {renderParentDescription()}
          {renderCompositionSelector()}
          <div class={!isEnabled ? 'opacity-50 pointer-events-none' : ''}>
            <CodeMirror
              value={objectValue}
              onChange={(value) => {
                if (!isEnabled) return;
                try {
                  // Try to parse as JSON when user types
                  const parsed = JSON.parse(value);
                  handleFieldChange(fieldName, parsed);
                } catch (e) {
                  // If invalid JSON, store as string temporarily
                  handleFieldChange(fieldName, value);
                }
              }}
              extensions={[
                json(),
                bracketMatching(),
                EditorView.theme({
                  "&": {
                    minHeight: "120px",
                    maxHeight: "120px",
                  },
                  ".cm-content, .cm-gutter": {
                    minHeight: "120px !important",
                    maxHeight: "120px !important"
                  },
                  ".cm-scroller": {
                    overflow: "auto",
                    maxHeight: "120px"
                  }
                })
              ]}
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
          </div>
          <p class="mt-1 text-xs text-gray-500">
            Field is an object you can manually construct above.
          </p>
          {renderEffectiveDescription()}
        </div>
      );
    }

    // Render CodeMirror for array type
    if (effectiveProperty.type === 'array') {
      // Convert array to JSON string for display
      const arrayValue = Array.isArray(fieldValue)
        ? JSON.stringify(fieldValue, null, 2)
        : fieldValue;

      return (
        <div key={fieldName} class="mb-4">
          {renderFieldLabel(fieldName)}
          {renderParentDescription()}
          {renderCompositionSelector()}
          <div class={!isEnabled ? 'opacity-50 pointer-events-none' : ''}>
            <CodeMirror
              value={arrayValue}
              onChange={(value) => {
                if (!isEnabled) return;
                try {
                  // Try to parse as JSON when user types
                  const parsed = JSON.parse(value);
                  handleFieldChange(fieldName, parsed);
                } catch (e) {
                  // If invalid JSON, store as string temporarily
                  handleFieldChange(fieldName, value);
                }
              }}
              extensions={[
                json(),
                bracketMatching(),
                EditorView.theme({
                  "&": {
                    minHeight: "120px",
                    maxHeight: "120px",
                  },
                  ".cm-content, .cm-gutter": {
                    minHeight: "120px !important",
                    maxHeight: "120px !important"
                  },
                  ".cm-scroller": {
                    overflow: "auto",
                    maxHeight: "120px"
                  }
                })
              ]}
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
          </div>
          <p class="mt-1 text-xs text-gray-500">
            Field is an array you can manually construct above.
          </p>
          {renderEffectiveDescription()}
        </div>
      );
    }

    // Default text input
    return (
      <div key={fieldName} class="mb-4">
        {renderFieldLabel(fieldName)}
        {renderParentDescription()}
        {renderCompositionSelector()}
        <div class={!isEnabled ? 'opacity-50' : ''}>
          <TextInput
            id={fieldName}
            type={inputType}
            value={fieldValue}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            placeholder={effectiveProperty.examples?.[0] || ''}
            disabled={isSubmitting || !isEnabled}
            rows={inputType === 'textarea' ? 4 : undefined}
            min={effectiveProperty.minimum}
            max={effectiveProperty.maximum}
          />
        </div>
        {renderEffectiveDescription()}
      </div>
    );
  };

  // Generate JSON preview from current form data
  const jsonPreview = convertFormData(formData);

  // CodeMirror extensions
  const getCodeMirrorExtensions = () => {
    return [
      json(),
      bracketMatching(),
      EditorView.editable.of(false), // Read-only
      EditorView.theme({
        "&": {
          height: "100%",
          minHeight: "168px",
        },
        ".cm-content, .cm-gutter": {
          minHeight: "168px !important",
          height: "100%"
        },
        ".cm-scroller": {
          overflow: "auto",
          height: "100%"
        }
      })
    ];
  };

  // Check if schema is valid
  if (!jsonSchema || !jsonSchema.properties) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Create request body payload" size="xl">
        <div class="text-sm text-gray-500 mb-4">
          Create a request body payload by filling out the form. Clicking "Import" will add it to the request editor.
        </div>
        <div class="text-sm text-red-600 bg-red-100 p-3 rounded-md">
          No valid JSON schema provided. Please provide a valid JSON schema with properties.
        </div>
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <Button
            type="button"
            onClick={handleClose}
            variant="secondary"
            size="md"
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create request body payload" size="xl">
      <div class="text-sm text-gray-500 mb-4">
        Create a request body payload by filling out the form. Clicking "Import" will add it to the request editor.
      </div>

      <form onSubmit={handleSubmit}>
        {/* Two-column layout: Form on left, JSON preview on right (hidden on mobile) */}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Left column: Form */}
          <div>
            {Object.entries(jsonSchema.properties).map(([fieldName, property]) =>
              renderField(fieldName, property)
            )}
          </div>

          {/* Right column: JSON Preview (hidden on mobile) */}
          <div class="hidden sm:flex sm:flex-col h-full">
            <Label>JSON Preview</Label>
            <div class="flex-1 min-h-0">
              <CodeMirror
                value={JSON.stringify(jsonPreview, null, 2)}
                extensions={getCodeMirrorExtensions()}
                theme={dracula}
                readOnly={true}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  dropCursor: false,
                  allowMultipleSelections: false,
                  indentOnInput: false,
                  bracketMatching: true,
                  closeBrackets: false,
                  autocompletion: false,
                  rectangularSelection: false,
                  searchKeymap: false,
                  highlightSelectionMatches: false
                }}
                style={{
                  border: '2px solid #282a36',
                  borderRadius: '0.375rem',
                  fontSize: '12px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
                  height: '100%'
                }}
              />
            </div>
          </div>
        </div>

        {error && (
          <div class="mt-4 text-sm text-red-600 bg-red-100 p-2 rounded-md">
            {error}
          </div>
        )}

        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <Button
            type="submit"
            disabled={isSubmitting}
            variant="primary"
            size="md"
            className="w-full sm:ml-3 sm:w-auto"
          >
            {isSubmitting ? 'Importing...' : 'Import'}
          </Button>
          <Button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            variant="secondary"
            size="md"
            className="mt-3 w-full sm:mt-0 sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
