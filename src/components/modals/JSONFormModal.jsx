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
  getSchemaOptionDisplayName,
  flattenAllOf
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
  const [flattenedSchema, setFlattenedSchema] = useState(null);

  // Form display controls
  const [mandatoryOnTop, setMandatoryOnTop] = useState(true);
  const [hideOptional, setHideOptional] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && jsonSchema) {
      // Flatten allOf instances in the schema first
      const flattened = flattenAllOf(jsonSchema);
      setFlattenedSchema(flattened);

      // Initialize form with default values from flattened schema
      const initialData = initializeFormData(flattened);
      setFormData(initialData);
      setError(null);
      // Initialize composition selections recursively (default to index 0)
      const initialSelections = initializeCompositionSelections(flattened);
      // Initialize enabled fields (required fields are enabled by default)
      const initialEnabled = {};
      if (flattened.properties) {
        Object.entries(flattened.properties).forEach(([fieldName, property]) => {
          // Required fields are enabled by default (but can be disabled)
          const isRequired = flattened.required?.includes(fieldName);
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
   * Check if a schema is structured (has defined type or composition)
   */
  const isStructuredSchema = (schema) => {
    if (!schema) return false;

    // Check for direct type or properties or enum
    if (schema.type || schema.properties || schema.enum) {
      return true;
    }

    // Check for composition (anyOf, oneOf, allOf)
    const composition = detectSchemaComposition(schema);
    return composition.hasComposition;
  };

  /**
   * Initialize composition selections recursively for nested schemas
   */
  const initializeCompositionSelections = (schema, path = '', selections = {}) => {
    if (!schema || typeof schema !== 'object') return selections;

    const composition = detectSchemaComposition(schema);
    if (composition.hasComposition) {
      selections[path] = 0;
    }

    // Recursively initialize for properties
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([propName, propSchema]) => {
        const propPath = path ? `${path}.${propName}` : propName;
        initializeCompositionSelections(propSchema, propPath, selections);
      });
    }

    // Recursively initialize for array items
    if (schema.items) {
      const itemPath = path ? `${path}.[item]` : '[item]';
      initializeCompositionSelections(schema.items, itemPath, selections);
    }

    return selections;
  };

  /**
   * Initialize enabled fields recursively for nested required fields
   */
  const initializeEnabledFields = (schema, path = '', enabled = {}) => {
    if (!schema || typeof schema !== 'object') return enabled;

    // Get effective schema (handle composition)
    const composition = detectSchemaComposition(schema);
    const effectiveSchema = composition.hasComposition
      ? composition.options[0] || {}
      : schema;

    // If this field itself should be enabled
    if (path) {
      // For nested fields, default to true if required, false otherwise
      // This will be overridden by parent logic if needed
      enabled[path] = true; // We'll set this properly when we know the context
    }

    // Recursively initialize for properties
    if (effectiveSchema.properties) {
      const required = effectiveSchema.required || [];
      Object.entries(effectiveSchema.properties).forEach(([propName, propSchema]) => {
        const propPath = path ? `${path}.${propName}` : propName;
        const isRequired = required.includes(propName);

        // Set enabled state for this property
        enabled[propPath] = isRequired;

        // Recursively initialize nested properties
        initializeEnabledFields(propSchema, propPath, enabled);
      });
    }

    return enabled;
  };

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
      } else if (effectiveProp.enum && Array.isArray(effectiveProp.enum) && effectiveProp.enum.length === 1) {
        // Single-option enum: auto-set the only value
        data[key] = effectiveProp.enum[0];
      } else if (effectiveProp.type === 'string') {
        data[key] = '';
      } else if (effectiveProp.type === 'number' || effectiveProp.type === 'integer') {
        data[key] = '';
      } else if (effectiveProp.type === 'boolean') {
        data[key] = false;
      } else if (effectiveProp.type === 'array') {
        // If array has defined items schema, initialize as actual array
        if (effectiveProp.items && isStructuredSchema(effectiveProp.items)) {
          data[key] = [];
        } else {
          // Otherwise, use JSON string for CodeMirror
          data[key] = '[]';
        }
      } else if (effectiveProp.type === 'object') {
        // If object has defined properties, initialize as actual object
        if (effectiveProp.properties) {
          data[key] = {};
        } else {
          // Otherwise, use JSON string for CodeMirror
          data[key] = '{}';
        }
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
   * Supports nested paths like "field.0" for array items or "field.property" for object properties
   */
  const handleFieldChange = (fieldName, value) => {
    // Check if this is a nested path
    if (fieldName.includes('.')) {
      const parts = fieldName.split('.');
      const rootField = parts[0];
      const nestedPath = parts.slice(1);

      setFormData(prev => {
        const rootValue = prev[rootField];
        const updated = setNestedValue(rootValue, nestedPath, value);
        return {
          ...prev,
          [rootField]: updated
        };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [fieldName]: value
      }));
    }

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  /**
   * Helper to set nested values in objects/arrays
   */
  const setNestedValue = (obj, path, value) => {
    // Handle undefined/null obj
    if (!obj) {
      obj = {};
    }

    if (path.length === 1) {
      const key = path[0];
      if (Array.isArray(obj)) {
        const newArray = [...obj];
        newArray[parseInt(key, 10)] = value;
        return newArray;
      } else {
        return { ...obj, [key]: value };
      }
    }

    const key = path[0];
    const remaining = path.slice(1);

    if (Array.isArray(obj)) {
      const newArray = [...obj];
      newArray[parseInt(key, 10)] = setNestedValue(obj[parseInt(key, 10)], remaining, value);
      return newArray;
    } else {
      return {
        ...obj,
        [key]: setNestedValue(obj[key] || {}, remaining, value)
      };
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
   * Helper to convert a single value based on its schema
   * @param {*} value - The value to convert
   * @param {Object} schema - The schema to use for conversion
   * @param {string} fieldPath - The path to this field (for composition selection lookup)
   */
  const convertValueBySchema = (value, schema, fieldPath = '') => {
    if (value === undefined || value === null) {
      return schema.type === 'null' ? null : value;
    }

    // Check for composition and use the selected option
    const composition = detectSchemaComposition(schema);
    const selectedIndex = compositionSelections[fieldPath] || 0;
    const effectiveSchema = composition.hasComposition
      ? composition.options[selectedIndex] || {}
      : schema;

    // Convert types
    if (effectiveSchema.type === 'number' || effectiveSchema.type === 'integer') {
      return value === '' ? 0 : Number(value);
    } else if (effectiveSchema.type === 'boolean') {
      return Boolean(value);
    } else if (effectiveSchema.type === 'null') {
      return null;
    } else if (effectiveSchema.type === 'object') {
      // If it's a string (JSON), try to parse it
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          return {};
        }
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // If object has defined properties, recursively convert nested values
        if (effectiveSchema.properties) {
          const converted = {};
          const required = effectiveSchema.required || [];
          Object.entries(value).forEach(([propKey, propValue]) => {
            if (effectiveSchema.properties[propKey]) {
              const propPath = fieldPath ? `${fieldPath}.${propKey}` : propKey;
              const isRequired = required.includes(propKey);
              const propEnabled = enabledFields[propPath] !== undefined ? enabledFields[propPath] : isRequired;

              // Skip disabled nested fields
              if (!propEnabled) {
                return;
              }

              converted[propKey] = convertValueBySchema(propValue, effectiveSchema.properties[propKey], propPath);
            } else {
              converted[propKey] = propValue;
            }
          });
          return converted;
        }
        // Already an object without defined properties, keep as-is
        return value;
      }
    } else if (effectiveSchema.type === 'array') {
      // If it's a string (JSON), try to parse it
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          return [];
        }
      } else if (Array.isArray(value)) {
        // If array has defined items schema (including composition), recursively convert array items
        if (effectiveSchema.items && isStructuredSchema(effectiveSchema.items)) {
          return value.map((item, index) => {
            const itemPath = fieldPath ? `${fieldPath}.${index}` : `${index}`;
            return convertValueBySchema(item, effectiveSchema.items, itemPath);
          });
        }
        // Already an array without defined items, keep as-is
        return value;
      }
    }

    // String or other types - keep as-is (including empty strings)
    return value;
  };

  /**
   * Convert form data to proper types based on schema
   */
  const convertFormData = (data) => {
    const schemaToUse = flattenedSchema || jsonSchema;
    if (!schemaToUse || !schemaToUse.properties) return data;

    const converted = {};
    Object.entries(schemaToUse.properties).forEach(([key, prop]) => {
      const value = data[key];
      const isEnabled = enabledFields[key];

      // Skip disabled fields
      if (!isEnabled) {
        return;
      }

      // Convert the value using the helper (with field path for composition lookup)
      converted[key] = convertValueBySchema(value, prop, key);
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
   * Handle composition selection change (supports nested paths)
   */
  const handleCompositionChange = (fieldPath, selectedIndex) => {
    setCompositionSelections(prev => ({
      ...prev,
      [fieldPath]: selectedIndex
    }));

    // Clear the field value when switching composition options
    // For nested paths, we need to update the nested value
    if (fieldPath.includes('.')) {
      const parts = fieldPath.split('.');
      const rootField = parts[0];
      const nestedPath = parts.slice(1);

      setFormData(prev => {
        const rootValue = prev[rootField];
        const updated = setNestedValue(rootValue, nestedPath, '');
        return {
          ...prev,
          [rootField]: updated
        };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [fieldPath]: ''
      }));
    }
  };

  /**
   * Helper to get default value for a schema property
   * Recursively initializes nested required fields with their default values
   */
  const getDefaultValueForProperty = (property) => {
    // Check for composition and use first option
    const composition = detectSchemaComposition(property);
    const effectiveProperty = composition.hasComposition
      ? composition.options[0] || {}
      : property;

    if (effectiveProperty.default !== undefined) {
      return effectiveProperty.default;
    }

    // Handle single-option enum
    if (effectiveProperty.enum && Array.isArray(effectiveProperty.enum) && effectiveProperty.enum.length === 1) {
      return effectiveProperty.enum[0];
    }

    switch (effectiveProperty.type) {
      case 'string':
        return '';
      case 'number':
      case 'integer':
        return '';
      case 'boolean':
        return false;
      case 'null':
        return null;
      case 'array':
        return [];
      case 'object':
        // If object has properties, initialize required fields with defaults
        if (effectiveProperty.properties) {
          const obj = {};
          const required = effectiveProperty.required || [];

          // Initialize all required fields with their default values
          required.forEach(requiredField => {
            if (effectiveProperty.properties[requiredField]) {
              obj[requiredField] = getDefaultValueForProperty(effectiveProperty.properties[requiredField]);
            }
          });

          return obj;
        }
        return {};
      default:
        return '';
    }
  };

  /**
   * Render label with enable checkbox for any field (top-level or nested)
   */
  const renderFieldLabelWithCheckbox = (fieldPath, title, isRequired = false, property = null) => {
    const fieldEnabled = enabledFields[fieldPath] !== undefined ? enabledFields[fieldPath] : isRequired;

    return (
      <div class="flex items-center justify-between mb-1">
        <Label htmlFor={fieldPath} mandatory={isRequired} className="mb-0">
          {title}
        </Label>
        <div class="flex items-center gap-1">
          <input
            type="checkbox"
            checked={fieldEnabled}
            onChange={(e) => {
              const isChecked = e.target.checked;
              setEnabledFields(prev => ({
                ...prev,
                [fieldPath]: isChecked
              }));

              // If enabling a single-enum field, set its value
              if (isChecked && property) {
                const composition = detectSchemaComposition(property);
                const effectiveProperty = composition.hasComposition
                  ? composition.options[0] || {}
                  : property;

                if (effectiveProperty.enum && Array.isArray(effectiveProperty.enum) && effectiveProperty.enum.length === 1) {
                  const singleValue = effectiveProperty.enum[0];
                  handleFieldChange(fieldPath, singleValue);
                }
              }
            }}
            class="h-3 w-3 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
          />
          <span class="text-xs text-gray-600">
            Enable
          </span>
        </div>
      </div>
    );
  };

  /**
   * Render individual field input (used for both top-level and nested fields)
   */
  const renderFieldInput = (fieldPath, property, isEnabled, isSubmitting, showEnableCheckbox = false) => {
    const fieldValue = fieldPath.includes('.')
      ? getNestedValue(formData, fieldPath.split('.'))
      : formData[fieldPath];

    // Check for composition (anyOf, oneOf, allOf) at nested level
    const composition = detectSchemaComposition(property);
    const hasComposition = composition.hasComposition;

    // Get the selected composition index from state
    const selectedCompositionIndex = compositionSelections[fieldPath] || 0;
    const effectiveProperty = hasComposition
      ? composition.options[selectedCompositionIndex] || {}
      : property;

    // Helper to check if we should render the description (avoiding duplicates for composition fields)
    const shouldRenderDescription = () => {
      if (!effectiveProperty.description) return false;

      // If this is a composition field, check for duplicate descriptions
      if (hasComposition) {
        const parentDesc = property.description?.trim();
        const effectiveDesc = effectiveProperty.description?.trim();
        // Don't render if they're the same (would be duplicate)
        return parentDesc !== effectiveDesc;
      }

      return true;
    };

    // If nested field has composition, render composition selector
    const renderNestedCompositionSelector = () => {
      if (!hasComposition) return null;

      const options = composition.options.map((option, index) => ({
        value: index.toString(),
        label: getSchemaOptionDisplayName(option, index)
      }));

      return (
        <div class="mb-1">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-gray-600">{getCompositionDisplayName(composition.type)}:</span>
            <Select
              value={selectedCompositionIndex.toString()}
              onChange={(value) => handleCompositionChange(fieldPath, parseInt(value, 10))}
              options={options}
              size="small"
              className="min-w-0 flex-1"
              disabled={isSubmitting || !isEnabled}
            />
          </div>
        </div>
      );
    };

    // Handle null type - render a simple disabled message
    if (effectiveProperty.type === 'null') {
      return (
        <>
          {renderNestedCompositionSelector()}
          <div class={`text-xs text-gray-500 italic p-2 bg-gray-50 rounded border border-gray-200 ${!isEnabled ? 'opacity-50' : ''}`}>
            Field is set to null
          </div>
          {shouldRenderDescription() && (
            <div class="mt-1 text-xs text-gray-500 [&_.prose]:text-xs [&_.prose]:text-gray-500">
              <MarkdownPreview markdown={effectiveProperty.description} />
            </div>
          )}
        </>
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
        <>
          {renderNestedCompositionSelector()}
          <div class={`flex items-center ${!isEnabled ? 'opacity-50' : ''}`}>
            <input
              id={fieldPath}
              type="checkbox"
              checked={fieldValue || false}
              onChange={(e) => handleFieldChange(fieldPath, e.target.checked)}
              disabled={isSubmitting || !isEnabled}
              class="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
            />
            <span class="ml-2 text-sm text-gray-700">
              Enabled
            </span>
          </div>
          {shouldRenderDescription() && (
            <div class="mt-1 text-xs text-gray-500 [&_.prose]:text-xs [&_.prose]:text-gray-500">
              <MarkdownPreview markdown={effectiveProperty.description} />
            </div>
          )}
        </>
      );
    }

    // Render select for enum
    if (effectiveProperty.enum && Array.isArray(effectiveProperty.enum)) {
      // If only one option, just show it as text
      if (effectiveProperty.enum.length === 1) {
        const singleValue = effectiveProperty.enum[0];
        return (
          <>
            {renderNestedCompositionSelector()}
            <TextInput
              id={fieldPath}
              value={singleValue}
              disabled={true}
              className={!isEnabled ? 'opacity-50' : ''}
            />
            {shouldRenderDescription() && (
              <div class="mt-1 text-xs text-gray-500 [&_.prose]:text-xs [&_.prose]:text-gray-500">
                <MarkdownPreview markdown={effectiveProperty.description} />
              </div>
            )}
          </>
        );
      }

      const enumOptions = [
        { value: '', label: 'Select an option' },
        ...effectiveProperty.enum.map(option => ({
          value: option,
          label: option
        }))
      ];

      return (
        <>
          {renderNestedCompositionSelector()}
          <Select
            id={fieldPath}
            value={fieldValue || ''}
            onChange={(value) => handleFieldChange(fieldPath, value)}
            options={enumOptions}
            disabled={isSubmitting || !isEnabled}
          />
          {shouldRenderDescription() && (
            <div class="mt-1 text-xs text-gray-500 [&_.prose]:text-xs [&_.prose]:text-gray-500">
              <MarkdownPreview markdown={effectiveProperty.description} />
            </div>
          )}
        </>
      );
    }

    // Handle object type
    if (effectiveProperty.type === 'object') {
      // If object has defined properties, render structured fields
      if (effectiveProperty.properties) {
        const required = effectiveProperty.required || [];
        return (
          <>
            {renderNestedCompositionSelector()}
            <div class={`space-y-3 p-3 bg-gray-50 rounded border border-gray-200 ${!isEnabled ? 'opacity-50' : ''}`}>
              {Object.entries(effectiveProperty.properties).map(([propName, propSchema]) => {
                const nestedPath = `${fieldPath}.${propName}`;
                const isRequired = required.includes(propName);
                const propEnabled = enabledFields[nestedPath] !== undefined ? enabledFields[nestedPath] : isRequired;

                return (
                  <div key={propName}>
                    {renderFieldLabelWithCheckbox(nestedPath, propSchema.title || propName, isRequired, propSchema)}
                    {renderFieldInput(nestedPath, propSchema, propEnabled && isEnabled, isSubmitting)}
                  </div>
                );
              })}
            </div>
            {shouldRenderDescription() && (
              <div class="mt-1 text-xs text-gray-500 [&_.prose]:text-xs [&_.prose]:text-gray-500">
                <MarkdownPreview markdown={effectiveProperty.description} />
              </div>
            )}
          </>
        );
      }

      // Otherwise, render CodeMirror for freeform object
      const objectValue = typeof fieldValue === 'object'
        ? JSON.stringify(fieldValue, null, 2)
        : fieldValue;

      return (
        <>
          {renderNestedCompositionSelector()}
          <div class={!isEnabled ? 'opacity-50 pointer-events-none' : ''}>
            <CodeMirror
              value={objectValue}
              onChange={(value) => {
                if (!isEnabled) return;
                try {
                  // Try to parse as JSON when user types
                  const parsed = JSON.parse(value);
                  handleFieldChange(fieldPath, parsed);
                } catch (e) {
                  // If invalid JSON, store as string temporarily
                  handleFieldChange(fieldPath, value);
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
          {shouldRenderDescription() && (
            <div class="mt-1 text-xs text-gray-500 [&_.prose]:text-xs [&_.prose]:text-gray-500">
              <MarkdownPreview markdown={effectiveProperty.description} />
            </div>
          )}
        </>
      );
    }

    // Handle array type
    if (effectiveProperty.type === 'array') {
      // If array has defined items schema, render structured list
      if (effectiveProperty.items && isStructuredSchema(effectiveProperty.items)) {
        return (
          <>
            {renderNestedCompositionSelector()}
            {renderNestedArrayWithItems(fieldPath, effectiveProperty, effectiveProperty.items, isEnabled, isSubmitting)}
            {shouldRenderDescription() && (
              <div class="mt-1 text-xs text-gray-500 [&_.prose]:text-xs [&_.prose]:text-gray-500">
                <MarkdownPreview markdown={effectiveProperty.description} />
              </div>
            )}
          </>
        );
      }

      // Otherwise, render CodeMirror for freeform array
      const arrayValue = Array.isArray(fieldValue)
        ? JSON.stringify(fieldValue, null, 2)
        : fieldValue;

      return (
        <>
          {renderNestedCompositionSelector()}
          <div class={!isEnabled ? 'opacity-50 pointer-events-none' : ''}>
            <CodeMirror
              value={arrayValue}
              onChange={(value) => {
                if (!isEnabled) return;
                try {
                  // Try to parse as JSON when user types
                  const parsed = JSON.parse(value);
                  handleFieldChange(fieldPath, parsed);
                } catch (e) {
                  // If invalid JSON, store as string temporarily
                  handleFieldChange(fieldPath, value);
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
          {shouldRenderDescription() && (
            <div class="mt-1 text-xs text-gray-500 [&_.prose]:text-xs [&_.prose]:text-gray-500">
              <MarkdownPreview markdown={effectiveProperty.description} />
            </div>
          )}
        </>
      );
    }

    // Default text input
    return (
      <>
        {renderNestedCompositionSelector()}
        <TextInput
          id={fieldPath}
          type={inputType}
          value={fieldValue || ''}
          onChange={(e) => handleFieldChange(fieldPath, e.target.value)}
          placeholder={effectiveProperty.examples?.[0] || ''}
          disabled={isSubmitting || !isEnabled}
          rows={inputType === 'textarea' ? 4 : undefined}
          min={effectiveProperty.minimum}
          max={effectiveProperty.maximum}
        />
        {shouldRenderDescription() && (
          <div class="mt-1 text-xs text-gray-500 [&_.prose]:text-xs [&_.prose]:text-gray-500">
            <MarkdownPreview markdown={effectiveProperty.description} />
          </div>
        )}
      </>
    );
  };

  /**
   * Helper to get nested value from object using path array
   */
  const getNestedValue = (obj, path) => {
    let current = obj;
    for (const key of path) {
      if (current == null) return undefined;
      current = Array.isArray(current) ? current[parseInt(key, 10)] : current[key];
    }
    return current;
  };

  /**
   * Render nested array field with add/remove functionality
   */
  const renderNestedArrayWithItems = (fieldPath, property, itemsSchema, isEnabled, isSubmitting) => {
    const arrayValue = fieldPath.includes('.')
      ? getNestedValue(formData, fieldPath.split('.'))
      : formData[fieldPath];

    const currentArray = arrayValue || [];

    const handleAddItem = () => {
      const newItem = getDefaultValueForProperty(itemsSchema);
      const newIndex = currentArray.length;

      // Initialize composition selections for the new array item
      const itemPath = `${fieldPath}.${newIndex}`;
      const newSelections = initializeCompositionSelections(itemsSchema, itemPath);
      setCompositionSelections(prev => ({
        ...prev,
        ...newSelections
      }));

      // Initialize enabled fields for the new array item's required fields
      const newEnabledFields = initializeEnabledFields(itemsSchema, itemPath);
      setEnabledFields(prev => ({
        ...prev,
        ...newEnabledFields
      }));

      handleFieldChange(fieldPath, [...currentArray, newItem]);
    };

    const handleRemoveItem = (index) => {
      const newArray = currentArray.filter((_, i) => i !== index);

      // Clean up composition selections for removed items
      setCompositionSelections(prev => {
        const updated = { ...prev };

        // Remove selections for items at and after the removed index
        Object.keys(updated).forEach(key => {
          if (key.startsWith(`${fieldPath}.`)) {
            const match = key.match(new RegExp(`^${fieldPath.replace(/\./g, '\\.')}\\.(\\d+)`));
            if (match) {
              const itemIndex = parseInt(match[1], 10);
              if (itemIndex >= index) {
                delete updated[key];
              }
            }
          }
        });

        // Re-add selections for remaining items with updated indices
        Object.entries(prev).forEach(([key, value]) => {
          if (key.startsWith(`${fieldPath}.`)) {
            const match = key.match(new RegExp(`^${fieldPath.replace(/\./g, '\\.')}\\.(\\d+)(\\..*)?$`));
            if (match) {
              const itemIndex = parseInt(match[1], 10);
              const suffix = match[2] || '';
              if (itemIndex > index) {
                const newKey = `${fieldPath}.${itemIndex - 1}${suffix}`;
                updated[newKey] = value;
              }
            }
          }
        });

        return updated;
      });

      handleFieldChange(fieldPath, newArray);
    };

    return (
      <div class={!isEnabled ? 'opacity-50' : ''}>
        <div class="space-y-2">
          {currentArray.map((item, index) => (
            <div key={index} class="flex items-start gap-2 p-3 bg-gray-50 rounded border border-gray-200">
              <div class="flex-1">
                {renderFieldInput(`${fieldPath}.${index}`, itemsSchema, isEnabled, isSubmitting)}
              </div>
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                disabled={isSubmitting || !isEnabled}
                class="cursor-pointer mt-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                title="Remove item"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          onClick={handleAddItem}
          disabled={isSubmitting || !isEnabled}
          variant="icon"
          size="xs"
          className="my-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add item
        </Button>
      </div>
    );
  };

  /**
   * Render array field with add/remove functionality for defined item schemas
   */
  const renderArrayWithItems = (fieldName, property, itemsSchema, isEnabled, isSubmitting) => {
    const arrayValue = formData[fieldName] || [];

    const handleAddItem = () => {
      const newItem = getDefaultValueForProperty(itemsSchema);
      const newIndex = arrayValue.length;

      // Initialize composition selections for the new array item
      const itemPath = `${fieldName}.${newIndex}`;
      const newSelections = initializeCompositionSelections(itemsSchema, itemPath);
      setCompositionSelections(prev => ({
        ...prev,
        ...newSelections
      }));

      // Initialize enabled fields for the new array item's required fields
      const newEnabledFields = initializeEnabledFields(itemsSchema, itemPath);
      setEnabledFields(prev => ({
        ...prev,
        ...newEnabledFields
      }));

      handleFieldChange(fieldName, [...arrayValue, newItem]);
    };

    const handleRemoveItem = (index) => {
      const newArray = arrayValue.filter((_, i) => i !== index);

      // Clean up composition selections for removed items
      // Also need to renumber remaining items
      setCompositionSelections(prev => {
        const updated = { ...prev };

        // Remove selections for items at and after the removed index
        Object.keys(updated).forEach(key => {
          if (key.startsWith(`${fieldName}.`)) {
            const match = key.match(new RegExp(`^${fieldName}\\.(\\d+)`));
            if (match) {
              const itemIndex = parseInt(match[1], 10);
              if (itemIndex >= index) {
                delete updated[key];
              }
            }
          }
        });

        // Re-add selections for remaining items with updated indices
        Object.entries(prev).forEach(([key, value]) => {
          if (key.startsWith(`${fieldName}.`)) {
            const match = key.match(new RegExp(`^${fieldName}\\.(\\d+)(\\..*)?$`));
            if (match) {
              const itemIndex = parseInt(match[1], 10);
              const suffix = match[2] || '';
              if (itemIndex > index) {
                const newKey = `${fieldName}.${itemIndex - 1}${suffix}`;
                updated[newKey] = value;
              }
            }
          }
        });

        return updated;
      });

      handleFieldChange(fieldName, newArray);
    };

    return (
      <div class={!isEnabled ? 'opacity-50' : ''}>
        <div class="space-y-2">
          {arrayValue.map((item, index) => (
            <div key={index} class="flex items-start gap-2 p-3 bg-gray-50 rounded border border-gray-200">
              <div class="flex-1">
                {renderFieldInput(`${fieldName}.${index}`, itemsSchema, isEnabled, isSubmitting)}
              </div>
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                disabled={isSubmitting || !isEnabled}
                class="cursor-pointer mt-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                title="Remove item"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          onClick={handleAddItem}
          disabled={isSubmitting || !isEnabled}
          variant="icon"
          size="xs"
          className="my-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add item
        </Button>
      </div>
    );
  };

  /**
   * Render object field with individual property fields
   */
  const renderObjectWithProperties = (fieldName, property, objectProperties, isEnabled, isSubmitting) => {
    const objectValue = formData[fieldName] || {};
    const required = property.required || [];

    return (
      <div class={`space-y-3 p-3 bg-gray-50 rounded border border-gray-200 ${!isEnabled ? 'opacity-50' : ''}`}>
        {Object.entries(objectProperties).map(([propName, propSchema]) => {
          const propPath = `${fieldName}.${propName}`;
          const isRequired = required.includes(propName);
          const propEnabled = enabledFields[propPath] !== undefined ? enabledFields[propPath] : isRequired;

          return (
            <div key={propName}>
              {renderFieldLabelWithCheckbox(propPath, propSchema.title || propName, isRequired, propSchema)}
              {renderFieldInput(propPath, propSchema, propEnabled && isEnabled, isSubmitting)}
            </div>
          );
        })}
      </div>
    );
  };

  /**
   * Render a form field based on JSON schema property
   */
  const renderField = (fieldName, property) => {
    const schemaToUse = flattenedSchema || jsonSchema;
    const isRequired = schemaToUse?.required?.includes(fieldName) || false;
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

      // If parent and effective descriptions are the same, only show it once here
      const parentDesc = property.description?.trim();
      const effectiveDesc = effectiveProperty.description?.trim();
      if (parentDesc === effectiveDesc) {
        return (
          <div class="mt-1 mb-2 text-xs text-gray-500 [&_.prose]:text-xs [&_.prose]:text-gray-500 [&_.prose_p]:text-gray-500 [&_.prose_li]:text-gray-500 [&_.prose_*]:text-gray-500">
            <MarkdownPreview markdown={property.description} />
          </div>
        );
      }

      // Descriptions are different, show parent here
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
      // For composition fields, only show the effective property description if it's different from parent
      if (composition.hasComposition) {
        if (!effectiveProperty.description) return null;

        // Check if descriptions are the same - if so, don't show it again
        const parentDesc = property.description?.trim();
        const effectiveDesc = effectiveProperty.description?.trim();
        if (parentDesc === effectiveDesc) {
          return null; // Already shown in renderParentDescription
        }

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
      // If only one option, just show it as text
      if (effectiveProperty.enum.length === 1) {
        const singleValue = effectiveProperty.enum[0];
        return (
          <div key={fieldName} class="mb-4">
            {renderFieldLabel(fieldName)}
            {renderParentDescription()}
            {renderCompositionSelector()}
            <TextInput
              id={fieldName}
              value={singleValue}
              disabled={true}
              className={!isEnabled ? 'opacity-50' : ''}
            />
            {renderEffectiveDescription()}
          </div>
        );
      }

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

    // Render object type
    if (effectiveProperty.type === 'object') {
      // If object has defined properties, render structured fields
      if (effectiveProperty.properties) {
        return (
          <div key={fieldName} class="mb-4">
            {renderFieldLabel(fieldName)}
            {renderParentDescription()}
            {renderCompositionSelector()}
            {renderObjectWithProperties(fieldName, effectiveProperty, effectiveProperty.properties, isEnabled, isSubmitting)}
            {renderEffectiveDescription()}
          </div>
        );
      }

      // Otherwise, render CodeMirror for freeform object
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

    // Render array type
    if (effectiveProperty.type === 'array') {
      // If array has defined items schema (including composition), render structured list
      if (effectiveProperty.items && isStructuredSchema(effectiveProperty.items)) {
        return (
          <div key={fieldName} class="mb-4">
            {renderFieldLabel(fieldName)}
            {renderParentDescription()}
            {renderCompositionSelector()}
            {renderArrayWithItems(fieldName, effectiveProperty, effectiveProperty.items, isEnabled, isSubmitting)}
            {renderEffectiveDescription()}
          </div>
        );
      }

      // Otherwise, render CodeMirror for freeform array
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
  const schemaToUse = flattenedSchema || jsonSchema;
  if (!schemaToUse || !schemaToUse.properties) {
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

  // Check if we should show form display controls
  const fieldCount = Object.keys(schemaToUse.properties).length;
  const mandatoryCount = schemaToUse.required?.length || 0;
  const shouldShowControls = fieldCount >= 10 && mandatoryCount > 0;

  /**
   * Get fields to display, filtered and sorted based on display controls
   */
  const getFieldsToDisplay = () => {
    let entries = Object.entries(schemaToUse.properties);

    // Filter out optional fields if hideOptional is enabled
    if (hideOptional) {
      entries = entries.filter(([fieldName]) =>
        schemaToUse.required?.includes(fieldName)
      );
    }

    // Sort with mandatory fields on top if enabled
    if (mandatoryOnTop) {
      entries.sort(([fieldNameA], [fieldNameB]) => {
        const isRequiredA = schemaToUse.required?.includes(fieldNameA) || false;
        const isRequiredB = schemaToUse.required?.includes(fieldNameB) || false;

        // If both required or both optional, maintain original order
        if (isRequiredA === isRequiredB) return 0;

        // Required fields come first
        return isRequiredA ? -1 : 1;
      });
    }

    return entries;
  };

  const fieldsToDisplay = getFieldsToDisplay();

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create request body payload" size="xl">
      <div class="text-sm text-gray-500 mb-4">
        Create a request body payload by filling out the form. Clicking "Import" will add it to the request editor.
      </div>

      {/* Form display controls */}
      {shouldShowControls && (
        <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <input
                id="mandatoryOnTop"
                type="checkbox"
                checked={mandatoryOnTop}
                onChange={(e) => setMandatoryOnTop(e.target.checked)}
                class="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
              />
              <label htmlFor="mandatoryOnTop" class="text-sm text-gray-700 cursor-pointer">
                Add mandatory fields on top
              </label>
            </div>
            <div class="flex items-center gap-2">
              <input
                id="hideOptional"
                type="checkbox"
                checked={hideOptional}
                onChange={(e) => setHideOptional(e.target.checked)}
                class="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
              />
              <label htmlFor="hideOptional" class="text-sm text-gray-700 cursor-pointer">
                Hide optional fields
              </label>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Two-column layout: Form on left, JSON preview on right (hidden on mobile) */}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Left column: Form */}
          <div>
            {fieldsToDisplay.map(([fieldName, property]) =>
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
