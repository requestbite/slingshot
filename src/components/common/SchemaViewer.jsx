import { useState, useEffect } from 'preact/hooks';
import { Select } from './Select';
import { SchemaTreeRoot } from './SchemaTree';
import { getStatusCodeDisplayName } from '../../utils/exampleParser';

// Component for viewing parameters schema (headers, query, path)
export function ParametersSchemaViewer({ parametersSchema, className = '' }) {
  if (!parametersSchema) {
    return null;
  }

  const sections = [];

  // Add headers section
  if (parametersSchema.headers && Object.keys(parametersSchema.headers).length > 0) {
    const headerSchema = {
      type: 'object',
      properties: {},
      required: []
    };

    for (const [name, param] of Object.entries(parametersSchema.headers)) {
      headerSchema.properties[name] = {
        type: param.type || param.schema?.type || 'string',
        description: param.description || '',
        ...param.schema
      };
      if (param.required) {
        headerSchema.required.push(name);
      }
    }

    sections.push({
      title: 'Headers',
      schema: headerSchema
    });
  }

  // Add query parameters section
  if (parametersSchema.query && Object.keys(parametersSchema.query).length > 0) {
    const querySchema = {
      type: 'object',
      properties: {},
      required: []
    };

    for (const [name, param] of Object.entries(parametersSchema.query)) {
      querySchema.properties[name] = {
        type: param.type || param.schema?.type || 'string',
        description: param.description || '',
        ...param.schema
      };
      if (param.required) {
        querySchema.required.push(name);
      }
    }

    sections.push({
      title: 'Query Parameters',
      schema: querySchema
    });
  }

  // Add path parameters section
  if (parametersSchema.path && Object.keys(parametersSchema.path).length > 0) {
    const pathSchema = {
      type: 'object',
      properties: {},
      required: []
    };

    for (const [name, param] of Object.entries(parametersSchema.path)) {
      pathSchema.properties[name] = {
        type: param.type || param.schema?.type || 'string',
        description: param.description || '',
        ...param.schema
      };
      if (param.required) {
        pathSchema.required.push(name);
      }
    }

    sections.push({
      title: 'Path Parameters',
      schema: pathSchema
    });
  }

  if (sections.length === 0) {
    return null;
  }

  return (
    <div class={`space-y-4 ${className}`}>
      <div class="flex items-center justify-between">
        <label class="block text-xs font-medium text-gray-600">Parameters Schema</label>
      </div>

      {sections.map((section, index) => (
        <div key={section.title} class={index > 0 ? '' : ''}>
          <SchemaTreeRoot
            schema={section.schema}
            title={section.title}
          />
        </div>
      ))}
    </div>
  );
}

// Component for viewing request body schema
export function RequestBodySchemaViewer({ requestBodySchema, className = '' }) {
  if (!requestBodySchema) {
    return null;
  }

  return (
    <div class={`space-y-2 ${className}`}>
      <div class="flex items-center justify-between">
        <label class="block text-xs font-medium text-gray-600">Request Body Schema</label>
      </div>

      <SchemaTreeRoot
        schema={requestBodySchema}
      />
    </div>
  );
}

// Component for viewing response schemas with status code selection
export function ResponseSchemasViewer({ responseSchemas, className = '' }) {
  const [selectedStatusCode, setSelectedStatusCode] = useState('');

  const statusCodes = Object.keys(responseSchemas || {}).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    return numA - numB;
  });

  // Auto-select first status code
  useEffect(() => {
    if (statusCodes.length > 0 && !selectedStatusCode) {
      setSelectedStatusCode(statusCodes[0]);
    }
    // Reset if selected status is no longer available
    else if (selectedStatusCode && !statusCodes.includes(selectedStatusCode)) {
      setSelectedStatusCode(statusCodes[0] || '');
    }
  }, [statusCodes, selectedStatusCode]);

  if (statusCodes.length === 0) {
    return null;
  }

  const selectedResponse = responseSchemas[selectedStatusCode];

  return (
    <div class={`space-y-2 ${className}`}>
      <div class="flex items-center justify-between">
        <label class="block text-xs font-medium text-gray-600">Response Schemas</label>
      </div>

      {statusCodes.length > 1 && (
        <Select
          value={selectedStatusCode}
          onChange={setSelectedStatusCode}
          options={statusCodes.map(code => ({
            value: code,
            label: getStatusCodeDisplayName(code)
          }))}
          placeholder="Select status code..."
          size="small"
        />
      )}

      {selectedResponse && selectedResponse.description && (
        <div class="text-xs text-gray-600 italic pb-1">
          {selectedResponse.description}
        </div>
      )}
      {selectedResponse && selectedResponse.schema && (
        <div class="space-y-2 pb-2">
          <SchemaTreeRoot
            schema={selectedResponse.schema}
            title={statusCodes.length === 1 ? getStatusCodeDisplayName(selectedStatusCode) : ""}
          />

        </div>
      )}
    </div>
  );
}

// Main schema viewer component that handles all schema types
export function SchemaViewer({
  parametersSchema,
  requestBodySchema,
  responseSchemas,
  className = ''
}) {
  const hasParametersSchema = parametersSchema && (
    Object.keys(parametersSchema.headers || {}).length > 0 ||
    Object.keys(parametersSchema.query || {}).length > 0 ||
    Object.keys(parametersSchema.path || {}).length > 0
  );

  const hasRequestBodySchema = requestBodySchema && typeof requestBodySchema === 'object';

  const hasResponseSchemas = responseSchemas && Object.keys(responseSchemas).length > 0;

  if (!hasParametersSchema && !hasRequestBodySchema && !hasResponseSchemas) {
    return null;
  }

  return (
    <div class={`space-y-4 ${className}`}>
      {hasParametersSchema && (
        <ParametersSchemaViewer parametersSchema={parametersSchema} />
      )}

      {hasRequestBodySchema && (
        <RequestBodySchemaViewer
          requestBodySchema={requestBodySchema}
          className={hasParametersSchema ? 'pt-4 border-t border-gray-200' : ''}
        />
      )}

      {hasResponseSchemas && (
        <ResponseSchemasViewer
          responseSchemas={responseSchemas}
          className={(hasParametersSchema || hasRequestBodySchema) ? 'pt-4 border-t border-gray-200' : ''}
        />
      )}
    </div>
  );
}
