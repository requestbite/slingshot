import { useState, useEffect } from 'preact/hooks';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TextInput } from '../common/TextInput';
import { Label } from '../common/Label';

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

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && jsonSchema) {
      // Initialize form with default values from schema
      const initialData = initializeFormData(jsonSchema);
      setFormData(initialData);
      setError(null);
    }
  }, [isOpen, jsonSchema]);

  /**
   * Initialize form data with default values from JSON schema
   */
  const initializeFormData = (schema) => {
    if (!schema || !schema.properties) return {};

    const data = {};
    Object.entries(schema.properties).forEach(([key, prop]) => {
      if (prop.default !== undefined) {
        data[key] = prop.default;
      } else if (prop.type === 'string') {
        data[key] = '';
      } else if (prop.type === 'number' || prop.type === 'integer') {
        data[key] = '';
      } else if (prop.type === 'boolean') {
        data[key] = false;
      } else if (prop.type === 'array') {
        data[key] = [];
      } else if (prop.type === 'object') {
        data[key] = {};
      } else {
        data[key] = '';
      }
    });
    return data;
  };

  /**
   * Validate form data against JSON schema
   */
  const validateForm = () => {
    if (!jsonSchema || !jsonSchema.properties) {
      setError('Invalid JSON schema provided');
      return false;
    }

    // Check required fields
    const required = jsonSchema.required || [];
    for (const field of required) {
      const value = formData[field];
      if (value === undefined || value === null || value === '') {
        setError(`Field "${field}" is required`);
        return false;
      }
    }

    // Basic type validation
    for (const [key, prop] of Object.entries(jsonSchema.properties)) {
      const value = formData[key];

      // Skip validation for empty optional fields
      if (!required.includes(key) && (value === '' || value === undefined)) {
        continue;
      }

      // Type validation
      if (prop.type === 'number' || prop.type === 'integer') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          setError(`Field "${key}" must be a valid number`);
          return false;
        }

        // Check minimum/maximum
        if (prop.minimum !== undefined && numValue < prop.minimum) {
          setError(`Field "${key}" must be at least ${prop.minimum}`);
          return false;
        }
        if (prop.maximum !== undefined && numValue > prop.maximum) {
          setError(`Field "${key}" must be at most ${prop.maximum}`);
          return false;
        }
      }

      // String validation
      if (prop.type === 'string') {
        if (prop.minLength !== undefined && value.length < prop.minLength) {
          setError(`Field "${key}" must be at least ${prop.minLength} characters`);
          return false;
        }
        if (prop.maxLength !== undefined && value.length > prop.maxLength) {
          setError(`Field "${key}" must be at most ${prop.maxLength} characters`);
          return false;
        }
        if (prop.pattern) {
          const regex = new RegExp(prop.pattern);
          if (!regex.test(value)) {
            setError(`Field "${key}" does not match required pattern`);
            return false;
          }
        }
      }
    }

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
   * Convert form data to proper types based on schema
   */
  const convertFormData = (data) => {
    if (!jsonSchema || !jsonSchema.properties) return data;

    const converted = { ...data };
    Object.entries(jsonSchema.properties).forEach(([key, prop]) => {
      const value = converted[key];

      // Skip empty optional fields
      if (!jsonSchema.required?.includes(key) && (value === '' || value === undefined)) {
        delete converted[key];
        return;
      }

      // Convert types
      if (prop.type === 'number' || prop.type === 'integer') {
        converted[key] = Number(value);
      } else if (prop.type === 'boolean') {
        converted[key] = Boolean(value);
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
   * Render a form field based on JSON schema property
   */
  const renderField = (fieldName, property) => {
    const isRequired = jsonSchema.required?.includes(fieldName) || false;
    const fieldValue = formData[fieldName] || '';

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
        <div key={fieldName} class="mb-4">
          <div class="flex items-center">
            <input
              id={fieldName}
              type="checkbox"
              checked={fieldValue}
              onChange={(e) => handleFieldChange(fieldName, e.target.checked)}
              disabled={isSubmitting}
              class="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
            />
            <Label
              htmlFor={fieldName}
              mandatory={isRequired}
              className="ml-2 mb-0"
            >
              {property.title || fieldName}
            </Label>
          </div>
          {property.description && (
            <p class="mt-1 text-xs text-gray-500 ml-6">
              {property.description}
            </p>
          )}
        </div>
      );
    }

    // Render select for enum
    if (property.enum && Array.isArray(property.enum)) {
      return (
        <div key={fieldName} class="mb-4">
          <Label htmlFor={fieldName} mandatory={isRequired}>
            {property.title || fieldName}
          </Label>
          <select
            id={fieldName}
            value={fieldValue}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            disabled={isSubmitting}
            required={isRequired}
            class="block w-full rounded-md px-3 py-2 text-gray-900 outline focus:outline-2 -outline-offset-1 outline-gray-300 focus:-outline-offset-2 focus:outline-sky-500 text-sm"
          >
            <option value="">Select an option</option>
            {property.enum.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {property.description && (
            <p class="mt-1 text-xs text-gray-500">
              {property.description}
            </p>
          )}
        </div>
      );
    }

    // Default text input
    return (
      <div key={fieldName} class="mb-4">
        <Label htmlFor={fieldName} mandatory={isRequired}>
          {property.title || fieldName}
        </Label>
        <TextInput
          id={fieldName}
          type={inputType}
          value={fieldValue}
          onChange={(e) => handleFieldChange(fieldName, e.target.value)}
          placeholder={property.examples?.[0] || ''}
          disabled={isSubmitting}
          required={isRequired}
          description={property.description}
          rows={inputType === 'textarea' ? 4 : undefined}
          min={property.minimum}
          max={property.maximum}
        />
      </div>
    );
  };

  // Check if schema is valid
  if (!jsonSchema || !jsonSchema.properties) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Schema based form" size="lg">
        <div class="text-sm text-gray-500 mb-4">
          Add JSON data to your request based on the schema-generated form below.
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Schema based form" size="lg">
      <div class="text-sm text-gray-500 mb-4">
        Add JSON data to your request based on the schema-generated form below.
      </div>

      <form onSubmit={handleSubmit}>
        <div class="max-h-[60vh] overflow-y-auto pr-2">
          {Object.entries(jsonSchema.properties).map(([fieldName, property]) =>
            renderField(fieldName, property)
          )}
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
