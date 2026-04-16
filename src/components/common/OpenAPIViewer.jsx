import { useState, useMemo } from 'preact/hooks';
import { BookMarked } from 'lucide-preact';
import { MarkdownPreview } from './MarkdownPreview';
import { ExampleViewer } from './ExampleViewer';
import { SchemaTreeRoot } from './SchemaTree';
import { Select } from './Select';
import { getMethodColor } from '../../utils/httpMethods';
import { flattenAllOf } from '../../utils/schemaParser';

// ---------------------------------------------------------------------------
// Stable endpoint ID (shared with nav panel)
// ---------------------------------------------------------------------------

export function getEndpointId(method, path) {
  return `openapi-ep-${method.toUpperCase()}-${path}`.replace(/[^a-zA-Z0-9-_]/g, '_');
}

// ---------------------------------------------------------------------------
// $ref resolution helpers
// ---------------------------------------------------------------------------

function resolveRef(ref, spec) {
  if (!ref || !ref.startsWith('#/')) return null;
  const parts = ref.slice(2).split('/');
  let current = spec;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return null;
    current = current[decodeURIComponent(part.replace(/~1/g, '/').replace(/~0/g, '~'))];
  }
  return current ?? null;
}

function resolveSchema(schema, spec, visited = new Set()) {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(item => resolveSchema(item, spec, visited));

  if (schema.$ref) {
    if (visited.has(schema.$ref)) return { type: 'object', description: '[Circular reference]' };
    const resolved = resolveRef(schema.$ref, spec);
    if (!resolved) return schema;
    const next = new Set(visited);
    next.add(schema.$ref);
    return resolveSchema(resolved, spec, next);
  }

  const result = {};
  for (const [key, value] of Object.entries(schema)) {
    result[key] = resolveSchema(value, spec, visited);
  }
  return result;
}

// ---------------------------------------------------------------------------
// OpenAPI spec parsing helpers
// ---------------------------------------------------------------------------

function buildParametersSchema(params, spec) {
  const result = { headers: {}, query: {}, path: {} };
  if (!params) return result;

  for (const param of params) {
    const p = param.$ref ? resolveRef(param.$ref, spec) : param;
    if (!p) continue;
    const schema = p.schema ? resolveSchema(flattenAllOf(p.schema), spec) : { type: 'string' };
    const entry = {
      type: schema.type || 'string',
      description: p.description || schema.description || '',
      required: p.required || false,
      schema
    };
    if (p.in === 'header') result.headers[p.name] = entry;
    else if (p.in === 'query') result.query[p.name] = entry;
    else if (p.in === 'path') result.path[p.name] = entry;
  }
  return result;
}

function buildRequestBodyInfo(requestBody, spec) {
  if (!requestBody) return null;
  const rb = requestBody.$ref ? resolveRef(requestBody.$ref, spec) : requestBody;
  if (!rb) return null;

  const result = {
    description: rb.description || '',
    required: rb.required || false,
    content: {}
  };

  for (const [ct, ctData] of Object.entries(rb.content || {})) {
    const schema = ctData.schema ? resolveSchema(flattenAllOf(ctData.schema), spec) : null;
    const examples = {};

    for (const [name, exData] of Object.entries(ctData.examples || {})) {
      const ex = exData.$ref ? resolveRef(exData.$ref, spec) : exData;
      if (ex) examples[name] = ex;
    }
    if (ctData.example !== undefined) {
      examples['Example'] = { value: ctData.example, summary: 'Example' };
    }

    result.content[ct] = { schema, examples };
  }
  return result;
}

function buildResponseSchemas(responses, spec) {
  if (!responses) return {};
  const result = {};

  for (const [code, respData] of Object.entries(responses)) {
    const resp = respData.$ref ? resolveRef(respData.$ref, spec) : respData;
    if (!resp) continue;

    const entry = {
      description: resp.description || '',
      headers: {},
      content: {}
    };

    for (const [name, hData] of Object.entries(resp.headers || {})) {
      const h = hData.$ref ? resolveRef(hData.$ref, spec) : hData;
      if (h) entry.headers[name] = h;
    }

    for (const [ct, ctData] of Object.entries(resp.content || {})) {
      const schema = ctData.schema ? resolveSchema(flattenAllOf(ctData.schema), spec) : null;
      const examples = {};

      for (const [name, exData] of Object.entries(ctData.examples || {})) {
        const ex = exData.$ref ? resolveRef(exData.$ref, spec) : exData;
        if (ex) examples[name] = ex;
      }
      if (ctData.example !== undefined) {
        examples['Example'] = { value: ctData.example, summary: 'Example' };
      }

      entry.content[ct] = { schema, examples };
    }

    result[code] = entry;
  }
  return result;
}

export function getOperationsByTag(spec) {
  const tagDescriptions = {};
  for (const tag of spec.tags || []) {
    tagDescriptions[tag.name] = tag.description || '';
  }

  const tagMap = new Map();

  for (const [path, pathItem] of Object.entries(spec.paths || {})) {
    const pathParams = pathItem.parameters || [];
    const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (!op) continue;

      const tags = op.tags?.length > 0 ? op.tags : ['default'];

      // Merge path-level and operation-level parameters (operation takes precedence)
      const opParams = op.parameters || [];
      const mergedParams = [...pathParams];
      for (const opParam of opParams) {
        const p = opParam.$ref ? resolveRef(opParam.$ref, spec) : opParam;
        if (!p) { mergedParams.push(opParam); continue; }
        const existing = mergedParams.findIndex(pp => {
          const pp2 = pp.$ref ? resolveRef(pp.$ref, spec) : pp;
          return pp2 && pp2.in === p.in && pp2.name === p.name;
        });
        if (existing >= 0) mergedParams[existing] = opParam;
        else mergedParams.push(opParam);
      }

      const entry = { method: method.toUpperCase(), path, operation: op, parameters: mergedParams };

      for (const tag of tags) {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, { name: tag, description: tagDescriptions[tag] || '', operations: [] });
        }
        tagMap.get(tag).operations.push(entry);
      }
    }
  }

  return Array.from(tagMap.values());
}

// ---------------------------------------------------------------------------
// Example generation from schema
// ---------------------------------------------------------------------------

function generateExampleFromSchema(schema, depth = 0) {
  if (!schema || typeof schema !== 'object' || depth > 8) return null;

  if (schema.example !== undefined) return schema.example;

  if (schema.allOf) {
    const merged = {};
    for (const s of schema.allOf) {
      const sub = generateExampleFromSchema(s, depth);
      if (sub && typeof sub === 'object' && !Array.isArray(sub)) {
        Object.assign(merged, sub);
      }
    }
    return Object.keys(merged).length > 0 ? merged : null;
  }
  if (schema.oneOf?.length > 0) return generateExampleFromSchema(schema.oneOf[0], depth);
  if (schema.anyOf?.length > 0) return generateExampleFromSchema(schema.anyOf[0], depth);

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  if (type === 'object' || (!type && schema.properties)) {
    const obj = {};
    for (const [key, propSchema] of Object.entries(schema.properties || {})) {
      const val = generateExampleFromSchema(propSchema, depth + 1);
      obj[key] = val !== null ? val : 'string';
    }
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object' && Object.keys(obj).length === 0) {
      obj['key'] = generateExampleFromSchema(schema.additionalProperties, depth + 1) ?? 'string';
    }
    return obj;
  }

  if (type === 'array') {
    if (schema.items) {
      const item = generateExampleFromSchema(schema.items, depth + 1);
      return [item !== null ? item : 'string'];
    }
    return [];
  }

  if (type === 'string') {
    if (schema.enum?.length > 0) return schema.enum[0];
    const fmt = schema.format;
    if (fmt === 'date') return '2024-01-01';
    if (fmt === 'date-time') return '2024-01-01T00:00:00Z';
    if (fmt === 'time') return '00:00:00';
    if (fmt === 'email') return 'user@example.com';
    if (fmt === 'uuid') return '00000000-0000-0000-0000-000000000000';
    if (fmt === 'uri' || fmt === 'url') return 'https://example.com';
    if (fmt === 'hostname') return 'example.com';
    if (fmt === 'ipv4') return '0.0.0.0';
    if (fmt === 'ipv6') return '::';
    if (fmt === 'byte') return '';
    return 'string';
  }

  if (type === 'integer') return 0;
  if (type === 'number') return 0.0;
  if (type === 'boolean') return true;
  if (type === 'null') return null;

  return null;
}

// ---------------------------------------------------------------------------
// Status code styling
// ---------------------------------------------------------------------------

function getStatusBadgeClass(code) {
  const n = parseInt(code, 10);
  if (n >= 200 && n < 300) return 'bg-emerald-100 text-emerald-800';
  if (n >= 300 && n < 400) return 'bg-blue-100 text-blue-800';
  if (n >= 400 && n < 500) return 'bg-amber-100 text-amber-800';
  if (n >= 500) return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
}

function getStatusLabel(code) {
  const labels = {
    '200': '200 OK', '201': '201 Created', '204': '204 No Content',
    '301': '301 Moved Permanently', '302': '302 Found', '304': '304 Not Modified',
    '400': '400 Bad Request', '401': '401 Unauthorized', '403': '403 Forbidden',
    '404': '404 Not Found', '405': '405 Method Not Allowed', '409': '409 Conflict',
    '422': '422 Unprocessable Entity', '429': '429 Too Many Requests',
    '500': '500 Internal Server Error', '502': '502 Bad Gateway', '503': '503 Service Unavailable'
  };
  return labels[code] || code;
}

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

function SectionLabel({ children }) {
  return (
    <span class="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
      {children}
    </span>
  );
}

function Divider() {
  return <div class="border-t border-gray-100 my-5" />;
}

// Compact parameters schema viewer that avoids the full SchemaViewer wrapper
function InlineParametersSchema({ parametersSchema }) {
  if (!parametersSchema) return null;
  const sections = [];

  if (Object.keys(parametersSchema.path || {}).length > 0) {
    const schema = { type: 'object', properties: {}, required: [] };
    for (const [n, p] of Object.entries(parametersSchema.path)) {
      schema.properties[n] = { ...p.schema, description: p.description };
      if (p.required) schema.required.push(n);
    }
    sections.push({ title: 'Path Parameters', schema });
  }

  if (Object.keys(parametersSchema.query || {}).length > 0) {
    const schema = { type: 'object', properties: {}, required: [] };
    for (const [n, p] of Object.entries(parametersSchema.query)) {
      schema.properties[n] = { ...p.schema, description: p.description };
      if (p.required) schema.required.push(n);
    }
    sections.push({ title: 'Query Parameters', schema });
  }

  if (Object.keys(parametersSchema.headers || {}).length > 0) {
    const schema = { type: 'object', properties: {}, required: [] };
    for (const [n, p] of Object.entries(parametersSchema.headers)) {
      schema.properties[n] = { ...p.schema, description: p.description };
      if (p.required) schema.required.push(n);
    }
    sections.push({ title: 'Headers', schema });
  }

  if (sections.length === 0) return null;

  return (
    <div class="space-y-4">
      {sections.map(s => <SchemaTreeRoot key={s.title} schema={s.schema} title={s.title} />)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EndpointSection
// ---------------------------------------------------------------------------

function EndpointSection({ method, path, operation, parameters, spec }) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Parsed data
  const parametersSchema = useMemo(
    () => buildParametersSchema(parameters, spec),
    [parameters, spec]
  );
  const requestBodyInfo = useMemo(
    () => buildRequestBodyInfo(operation.requestBody, spec),
    [operation.requestBody, spec]
  );
  const responseSchemas = useMemo(
    () => buildResponseSchemas(operation.responses, spec),
    [operation.responses, spec]
  );

  const hasParams = parametersSchema && (
    Object.keys(parametersSchema.path || {}).length > 0 ||
    Object.keys(parametersSchema.query || {}).length > 0 ||
    Object.keys(parametersSchema.headers || {}).length > 0
  );

  const requestBodyContentTypes = requestBodyInfo ? Object.keys(requestBodyInfo.content || {}) : [];
  const responseCodes = Object.keys(responseSchemas).sort((a, b) => parseInt(a) - parseInt(b));

  // Request body state
  const [reqCT, setReqCT] = useState('');
  const effectiveReqCT = reqCT || requestBodyContentTypes[0] || '';
  const reqSchema = requestBodyInfo?.content[effectiveReqCT]?.schema || null;
  const reqExamples = useMemo(() => {
    const raw = requestBodyInfo?.content[effectiveReqCT]?.examples || {};
    const entries = Object.entries(raw).map(([name, ex]) => ({
      name: ex.summary || name,
      value: ex.value,
      summary: ex.summary || ''
    }));
    if (entries.length === 0 && reqSchema) {
      const generated = generateExampleFromSchema(reqSchema);
      if (generated !== null) {
        entries.push({ name: 'Generated Request Example', value: generated, summary: '' });
      }
    }
    return entries;
  }, [requestBodyInfo, effectiveReqCT, reqSchema]);

  // Response schema state
  const [respSchemaCode, setRespSchemaCode] = useState('');
  const effectiveRespSchemaCode = respSchemaCode || responseCodes[0] || '';
  const respSchemaContentTypes = effectiveRespSchemaCode
    ? Object.keys(responseSchemas[effectiveRespSchemaCode]?.content || {})
    : [];
  const [respSchemaCT, setRespSchemaCT] = useState('');
  const effectiveRespSchemaCT = respSchemaCT || respSchemaContentTypes[0] || '';
  const selectedRespSchema = responseSchemas[effectiveRespSchemaCode]?.content?.[effectiveRespSchemaCT]?.schema;
  const respSchemaDescription = responseSchemas[effectiveRespSchemaCode]?.description || '';

  // Response examples state
  const [respExCode, setRespExCode] = useState('');
  const effectiveRespExCode = respExCode || responseCodes[0] || '';
  const respExContentTypes = effectiveRespExCode
    ? Object.keys(responseSchemas[effectiveRespExCode]?.content || {})
    : [];
  const [respExCT, setRespExCT] = useState('');
  const effectiveRespExCT = respExCT || respExContentTypes[0] || '';
  const respExamples = useMemo(() => {
    const raw = responseSchemas[effectiveRespExCode]?.content?.[effectiveRespExCT]?.examples || {};
    const entries = Object.entries(raw).map(([name, ex]) => ({
      name: ex.summary || name,
      value: ex.value,
      summary: ex.summary || ''
    }));
    if (entries.length === 0) {
      const schema = responseSchemas[effectiveRespExCode]?.content?.[effectiveRespExCT]?.schema;
      if (schema) {
        const generated = generateExampleFromSchema(schema);
        if (generated !== null) {
          entries.push({ name: 'Generated Response Example', value: generated, summary: '' });
        }
      }
    }
    return entries;
  }, [responseSchemas, effectiveRespExCode, effectiveRespExCT]);

  const hasRightContent = reqExamples.length > 0 || respExamples.length > 0;
  const hasLeftContent = !!operation.description || hasParams || !!reqSchema || responseCodes.length > 0;

  return (
    <div id={getEndpointId(method, path)} class="border-b border-gray-200 last:border-b-0 scroll-mt-[73px]">
      {/* Endpoint header – always visible */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        class="w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-50 text-left group transition-colors"
      >
        <span class={`text-[10px] font-bold text-white py-0.5 px-1.5 rounded flex-shrink-0 uppercase tracking-wide ${getMethodColor(method)}`}>
          {method}
        </span>
        <code class="text-sm text-gray-700 font-mono flex-1 truncate">{path}</code>
        {operation.summary && (
          <span class="text-sm text-gray-500 truncate max-w-xs hidden lg:block">{operation.summary}</span>
        )}
        {operation.deprecated && (
          <span class="text-[10px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0">
            Deprecated
          </span>
        )}
        <svg
          class={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded body – two-column layout */}
      {isExpanded && (hasLeftContent || hasRightContent) && (
        <div class="grid grid-cols-1 lg:grid-cols-2 min-h-0">
          {/* ---- LEFT PANEL ---- */}
          <div class="px-6 py-5 space-y-5 border-t border-gray-100 lg:border-r lg:border-gray-200 min-w-0">

            {/* Operation-level description */}
            {operation.description && (
              <div class="text-sm [&_.prose]:text-sm [&_.prose_p]:text-gray-600 [&_.prose_li]:text-gray-600">
                <MarkdownPreview markdown={operation.description} />
              </div>
            )}

            {/* Parameters */}
            {hasParams && (
              <div>
                {operation.description && <Divider />}
                <SectionLabel>Parameters</SectionLabel>
                <InlineParametersSchema parametersSchema={parametersSchema} />
              </div>
            )}

            {/* Request body schema */}
            {requestBodyInfo && (
              <div>
                {(operation.description || hasParams) && <Divider />}
                <div class="flex items-center justify-between mb-2">
                  <SectionLabel>Request Body{requestBodyInfo.required ? '' : ' (optional)'}</SectionLabel>
                  {requestBodyContentTypes.length > 1 && (
                    <div class="w-44">
                      <Select
                        value={effectiveReqCT}
                        onChange={setReqCT}
                        options={requestBodyContentTypes.map(ct => ({ value: ct, label: ct }))}
                        size="small"
                      />
                    </div>
                  )}
                </div>
                {requestBodyInfo.description && (
                  <p class="text-xs text-gray-500 mb-3">{requestBodyInfo.description}</p>
                )}
                {reqSchema && (
                  <SchemaTreeRoot schema={reqSchema} />
                )}
              </div>
            )}

            {/* Response schemas */}
            {responseCodes.length > 0 && (
              <div>
                {(operation.description || hasParams || requestBodyInfo) && <Divider />}
                <div class="flex items-center justify-between mb-2">
                  <SectionLabel>Response</SectionLabel>
                  <div class="flex items-center gap-2">
                    {responseCodes.length > 1 && (
                      <div class="w-36">
                        <Select
                          value={effectiveRespSchemaCode}
                          onChange={(v) => { setRespSchemaCode(v); setRespSchemaCT(''); }}
                          options={responseCodes.map(c => ({
                            value: c,
                            label: getStatusLabel(c)
                          }))}
                          size="small"
                        />
                      </div>
                    )}
                    {respSchemaContentTypes.length > 1 && (
                      <div class="w-44">
                        <Select
                          value={effectiveRespSchemaCT}
                          onChange={setRespSchemaCT}
                          options={respSchemaContentTypes.map(ct => ({ value: ct, label: ct }))}
                          size="small"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Status badge + description row */}
                {effectiveRespSchemaCode && (
                  <div class="flex items-center gap-2 mb-3">
                    <span class={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getStatusBadgeClass(effectiveRespSchemaCode)}`}>
                      {getStatusLabel(effectiveRespSchemaCode)}
                    </span>
                    {respSchemaDescription && (
                      <span class="text-xs text-gray-500 truncate">{respSchemaDescription}</span>
                    )}
                  </div>
                )}

                {selectedRespSchema ? (
                  <SchemaTreeRoot schema={selectedRespSchema} />
                ) : effectiveRespSchemaCode && !respSchemaContentTypes.length ? (
                  <p class="text-xs text-gray-400 italic">No response body.</p>
                ) : null}
              </div>
            )}
          </div>

          {/* ---- RIGHT PANEL (dark – examples) ---- */}
          <div class="bg-[#282a36] px-6 py-5 space-y-5 border-t border-gray-100 min-w-0">

            {/* Request examples */}
            {reqExamples.length > 0 && (
              <div>
                <div class="flex items-center justify-between mb-2">
                  <SectionLabel>
                    <span class="text-gray-400">Request Example</span>
                  </SectionLabel>
                  {requestBodyContentTypes.length > 1 && (
                    <div class="w-44">
                      <Select
                        value={effectiveReqCT}
                        onChange={setReqCT}
                        options={requestBodyContentTypes.map(ct => ({ value: ct, label: ct }))}
                        size="small"
                      />
                    </div>
                  )}
                </div>
                <ExampleViewer
                  examples={reqExamples}
                  title=""
                  contentType={effectiveReqCT || 'application/json'}
                />
              </div>
            )}

            {/* Response examples */}
            {respExamples.length > 0 && (
              <div>
                {reqExamples.length > 0 && <div class="border-t border-gray-700 my-4" />}
                <div class="flex items-center justify-between mb-2">
                  <SectionLabel>
                    <span class="text-gray-400">Response Example</span>
                  </SectionLabel>
                  <div class="flex items-center gap-2">
                    {responseCodes.length > 1 && (
                      <div class="w-36">
                        <Select
                          value={effectiveRespExCode}
                          onChange={(v) => { setRespExCode(v); setRespExCT(''); }}
                          options={responseCodes.map(c => ({
                            value: c,
                            label: getStatusLabel(c)
                          }))}
                          size="small"
                        />
                      </div>
                    )}
                    {respExContentTypes.length > 1 && (
                      <div class="w-44">
                        <Select
                          value={effectiveRespExCT}
                          onChange={setRespExCT}
                          options={respExContentTypes.map(ct => ({ value: ct, label: ct }))}
                          size="small"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {effectiveRespExCode && (
                  <div class="flex items-center gap-2 mb-3">
                    <span class={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getStatusBadgeClass(effectiveRespExCode)}`}>
                      {getStatusLabel(effectiveRespExCode)}
                    </span>
                  </div>
                )}

                <ExampleViewer
                  examples={respExamples}
                  title=""
                  contentType={effectiveRespExCT || 'application/json'}
                />
              </div>
            )}

            {/* Placeholder if no examples at all */}
            {!hasRightContent && (
              <p class="text-xs text-gray-500 italic">No examples provided.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TagSection
// ---------------------------------------------------------------------------

function TagSection({ tag, spec }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <section class="mb-2">
      {/* Tag header */}
      <button
        onClick={() => setIsCollapsed(v => !v)}
        class="w-full flex items-center gap-2 px-6 py-3 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 text-left transition-colors"
      >
        <svg
          class={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
        <h2 class="text-sm font-semibold text-gray-800 capitalize">{tag.name}</h2>
        <span class="ml-auto text-xs text-gray-400">{tag.operations.length} endpoint{tag.operations.length !== 1 ? 's' : ''}</span>
      </button>

      {!isCollapsed && (
        <div>
          {tag.description && (
            <div class="px-6 py-3 bg-white border-b border-gray-100 text-sm text-gray-600 [&_.prose]:text-sm">
              <MarkdownPreview markdown={tag.description} />
            </div>
          )}
          <div class="bg-white">
            {tag.operations.map(({ method, path, operation, parameters }) => (
              <EndpointSection
                key={`${method}-${path}`}
                method={method}
                path={path}
                operation={operation}
                parameters={parameters}
                spec={spec}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// ApiInfoHeader
// ---------------------------------------------------------------------------

function ApiInfoHeader({ info, servers, overrideTitle, overrideDescription, breadcrumbs, onImportClick, externalDocsUrl }) {
  const title = overrideTitle || info?.title || 'API Documentation';
  const description = overrideDescription !== undefined ? overrideDescription : info?.description;

  const hasRightContent = (servers?.length > 0) || !!(info?.contact || info?.license || info?.termsOfService);

  return (
    <header class="border-b border-gray-200 bg-white">
      {/* Top section: breadcrumbs + actions + title */}
      <div class="px-6 pt-6 pb-5">
        {(breadcrumbs || externalDocsUrl || onImportClick) && (
          <div class="flex items-start justify-between mb-4">
            <div>{breadcrumbs}</div>
            <div class="flex items-center gap-2">
              {externalDocsUrl && (
                <a
                  href={externalDocsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="rounded-md bg-sky-100 hover:bg-sky-200 py-2 px-3 text-sm font-medium text-sky-700 flex items-center"
                >
                  <BookMarked size={16} class="mr-2" />
                  Docs
                </a>
              )}
              {onImportClick && (
                <button
                  onClick={(e) => onImportClick(e.currentTarget)}
                  class="rounded-md bg-sky-100 hover:bg-sky-200 py-2 px-3 text-sm font-medium text-sky-700 flex items-center cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                    <path d="M12 15V3" />
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="m7 10 5 5 5-5" />
                  </svg>
                  Open in Slingshot
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-2">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-gray-900">{title}</h1>
          {info?.version && (
            <span class="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              v{info.version}
            </span>
          )}
        </div>
      </div>

      {/* Two-column body: description left, servers + links right */}
      {(description || hasRightContent) && (
        <div class="grid grid-cols-1 lg:grid-cols-2 border-t border-gray-100 min-h-0">
          {/* Left: description */}
          <div class="px-6 py-5 border-b lg:border-b-0 lg:border-r border-gray-200 min-w-0">
            {description ? (
              <div class="text-sm [&_.prose]:text-sm [&_.prose_p]:text-gray-600">
                <MarkdownPreview markdown={description} />
              </div>
            ) : (
              <p class="text-xs text-gray-400 italic">No description.</p>
            )}
          </div>

          {/* Right: servers + links (dark panel) */}
          <div class="bg-[#282a36] px-6 py-5 space-y-4 min-w-0">
            {servers?.length > 0 && (
              <div>
                <span class="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Base URL{servers.length > 1 ? 's' : ''}
                </span>
                <div class="flex flex-col gap-2">
                  {servers.map((server, i) => (
                    <div key={i} class="flex flex-wrap items-center gap-1.5 text-xs bg-[#1e2029] border border-[#3d3f4e] rounded px-2 py-1.5">
                      <code class="font-mono text-gray-200 break-all">{server.url}</code>
                      {server.description && (
                        <span class="text-gray-500">— {server.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(info?.contact || info?.license || info?.termsOfService) && (
              <div>
                <span class="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Links</span>
                <div class="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-400">
                  {info.contact?.url && (
                    <a href={info.contact.url} target="_blank" rel="noopener noreferrer" class="hover:text-sky-400 underline">
                      {info.contact.name || 'Contact'}
                    </a>
                  )}
                  {info.contact?.email && (
                    <a href={`mailto:${info.contact.email}`} class="hover:text-sky-400 underline">
                      {info.contact.email}
                    </a>
                  )}
                  {info.license && (
                    <span>
                      {info.license.url
                        ? <a href={info.license.url} target="_blank" rel="noopener noreferrer" class="hover:text-sky-400 underline">{info.license.name}</a>
                        : <span>{info.license.name}</span>
                      }
                    </span>
                  )}
                  {info.termsOfService && (
                    <a href={info.termsOfService} target="_blank" rel="noopener noreferrer" class="hover:text-sky-400 underline">
                      Terms of Service
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Main OpenAPIViewer
// ---------------------------------------------------------------------------

export function OpenAPIViewer({ spec, className = '', overrideTitle, overrideDescription, breadcrumbs, onImportClick, externalDocsUrl }) {
  const tagGroups = useMemo(() => {
    if (!spec || !spec.paths) return [];
    return getOperationsByTag(spec);
  }, [spec]);

  if (!spec) {
    return (
      <div class={`flex items-center justify-center h-32 text-gray-400 text-sm ${className}`}>
        No OpenAPI spec provided.
      </div>
    );
  }

  if (!spec.paths || Object.keys(spec.paths).length === 0) {
    return (
      <div class={`flex items-center justify-center h-32 text-gray-400 text-sm ${className}`}>
        No paths found in spec.
      </div>
    );
  }

  return (
    <div class={`bg-gray-50 min-h-full ${className}`}>
      <ApiInfoHeader
        info={spec.info}
        servers={spec.servers}
        overrideTitle={overrideTitle}
        overrideDescription={overrideDescription}
        breadcrumbs={breadcrumbs}
        onImportClick={onImportClick}
        externalDocsUrl={externalDocsUrl}
      />

      <div class="divide-y divide-gray-200">
        {tagGroups.map(tag => (
          <TagSection key={tag.name} tag={tag} spec={spec} />
        ))}
      </div>
    </div>
  );
}
