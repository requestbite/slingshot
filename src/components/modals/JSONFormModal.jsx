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
      // Initialize composition selections (default to index 0)
      const initialSelections = {};
      // Initialize enabled fields (required fields are enabled by default)
      const initialEnabled = {};
      if (flattened.properties) {
        Object.entries(flattened.properties).forEach(([fieldName, property]) => {
          const composition = detectSchemaComposition(property);
          if (composition.hasComposition) {
            initialSelections[fieldName] = 0;
          }
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
        // If array has defined items schema, initialize as actual array
        if (effectiveProp.items && (effectiveProp.items.type || effectiveProp.items.properties || effectiveProp.items.enum)) {
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
   */
  const convertValueBySchema = (value, schema) => {
    if (value === undefined || value === null) {
      return schema.type === 'null' ? null : value;
    }

    // Convert types
    if (schema.type === 'number' || schema.type === 'integer') {
      return value === '' ? 0 : Number(value);
    } else if (schema.type === 'boolean') {
      return Boolean(value);
    } else if (schema.type === 'null') {
      return null;
    } else if (schema.type === 'object') {
      // If it's a string (JSON), try to parse it
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          return {};
        }
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // If object has defined properties, recursively convert nested values
        if (schema.properties) {
          const converted = {};
          Object.entries(value).forEach(([propKey, propValue]) => {
            if (schema.properties[propKey]) {
              converted[propKey] = convertValueBySchema(propValue, schema.properties[propKey]);
            } else {
              converted[propKey] = propValue;
            }
          });
          return converted;
        }
        // Already an object without defined properties, keep as-is
        return value;
      }
    } else if (schema.type === 'array') {
      // If it's a string (JSON), try to parse it
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          return [];
        }
      } else if (Array.isArray(value)) {
        // If array has defined items schema, recursively convert array items
        if (schema.items && (schema.items.type || schema.items.properties || schema.items.enum)) {
          return value.map(item => convertValueBySchema(item, schema.items));
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

      // Check for composition and get effective property
      const composition = detectSchemaComposition(prop);
      const selectedIndex = compositionSelections[key] || 0;
      const effectiveProp = composition.hasComposition
        ? composition.options[selectedIndex] || {}
        : prop;

      // Convert the value using the helper
      converted[key] = convertValueBySchema(value, effectiveProp);
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
   * Helper to get default value for a schema property
   */
  const getDefaultValueForProperty = (property) => {
    if (property.default !== undefined) {
      return property.default;
    }

    switch (property.type) {
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
        return {};
      default:
        return '';
    }
  };

  /**
   * Render individual field input (used for both top-level and nested fields)
   */
  const renderFieldInput = (fieldPath, property, isEnabled, isSubmitting) => {
    const fieldValue = fieldPath.includes('.')
      ? getNestedValue(formData, fieldPath.split('.'))
      : formData[fieldPath];

    // Determine input type based on schema type
    let inputType = 'text';
    if (property.type === 'number' || property.type === 'integer') {
      inputType = 'number';
    } else if (property.format === 'email') {
      inputType = 'email';
    } else if (property.format === 'uri') {
      inputType = 'url';
    } else if (property.format === 'date') {
      inputType = 'date';
    } else if (property.format === 'date-time') {
      inputType = 'datetime-local';
    }

    // Use textarea for long text
    if (property.type === 'string' && property.maxLength && property.maxLength > 100) {
      inputType = 'textarea';
    }

    // Render checkbox for boolean
    if (property.type === 'boolean') {
      return (
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
      );
    }

    // Render select for enum
    if (property.enum && Array.isArray(property.enum)) {
      const enumOptions = [
        { value: '', label: 'Select an option' },
        ...property.enum.map(option => ({
          value: option,
          label: option
        }))
      ];

      return (
        <Select
          id={fieldPath}
          value={fieldValue || ''}
          onChange={(value) => handleFieldChange(fieldPath, value)}
          options={enumOptions}
          disabled={isSubmitting || !isEnabled}
        />
      );
    }

    // Default text input
    return (
      <TextInput
        id={fieldPath}
        type={inputType}
        value={fieldValue || ''}
        onChange={(e) => handleFieldChange(fieldPath, e.target.value)}
        placeholder={property.examples?.[0] || ''}
        disabled={isSubmitting || !isEnabled}
        rows={inputType === 'textarea' ? 4 : undefined}
        min={property.minimum}
        max={property.maximum}
      />
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
   * Render array field with add/remove functionality for defined item schemas
   */
  const renderArrayWithItems = (fieldName, property, itemsSchema, isEnabled, isSubmitting) => {
    const arrayValue = formData[fieldName] || [];

    const handleAddItem = () => {
      const newItem = getDefaultValueForProperty(itemsSchema);
      handleFieldChange(fieldName, [...arrayValue, newItem]);
    };

    const handleRemoveItem = (index) => {
      const newArray = arrayValue.filter((_, i) => i !== index);
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
                class="mt-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                title="Remove item"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAddItem}
          disabled={isSubmitting || !isEnabled}
          class="mt-2 text-sm text-sky-600 hover:text-sky-800 disabled:opacity-50 flex items-center gap-1"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add item
        </button>
      </div>
    );
  };

  /**
   * Render object field with individual property fields
   */
  const renderObjectWithProperties = (fieldName, property, objectProperties, isEnabled, isSubmitting) => {
    const objectValue = formData[fieldName] || {};

    return (
      <div class={`space-y-3 p-3 bg-gray-50 rounded border border-gray-200 ${!isEnabled ? 'opacity-50' : ''}`}>
        {Object.entries(objectProperties).map(([propName, propSchema]) => {
          const propPath = `${fieldName}.${propName}`;
          return (
            <div key={propName}>
              <Label htmlFor={propPath} className="mb-1">
                {propSchema.title || propName}
              </Label>
              {renderFieldInput(propPath, propSchema, isEnabled, isSubmitting)}
              {propSchema.description && (
                <div class="mt-1 text-xs text-gray-500 [&_.prose]:text-xs [&_.prose]:text-gray-500">
                  <MarkdownPreview markdown={propSchema.description} />
                </div>
              )}
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
      // If array has defined items schema, render structured list
      if (effectiveProperty.items && (effectiveProperty.items.type || effectiveProperty.items.properties || effectiveProperty.items.enum)) {
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
            {Object.entries(schemaToUse.properties).map(([fieldName, property]) =>
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
