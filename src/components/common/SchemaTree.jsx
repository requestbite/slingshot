import { useState } from 'preact/hooks';
import { Select } from './Select';
import { MarkdownPreview } from './MarkdownPreview';
import {
  detectSchemaComposition,
  getCompositionDisplayName,
  getSchemaOptionDisplayName
} from '../../utils/schemaParser';

export function SchemaTree({
  schema,
  name = '',
  level = 0,
  isRequired = false,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const [selectedCompositionIndex, setSelectedCompositionIndex] = useState(0);

  if (!schema) {
    return null;
  }

  const composition = detectSchemaComposition(schema);
  const effectiveSchema = composition.hasComposition
    ? composition.options[selectedCompositionIndex] || {}
    : schema;

  const hasChildren = effectiveSchema.type === 'object' && effectiveSchema.properties ||
    effectiveSchema.type === 'array' && effectiveSchema.items;

  const getTypeDisplay = (schema) => {
    if (schema.type === 'array' && schema.items) {
      return `array<${schema.items.type || 'any'}>`;
    }
    return schema.type || 'any';
  };

  const getTypeBadgeColor = (type) => {
    const colors = {
      string: 'bg-green-100 text-green-800',
      number: 'bg-blue-100 text-blue-800',
      integer: 'bg-blue-100 text-blue-800',
      boolean: 'bg-purple-100 text-purple-800',
      object: 'bg-orange-100 text-orange-800',
      array: 'bg-pink-100 text-pink-800',
      any: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.any;
  };

  const renderCompositionSelector = () => {
    if (!composition.hasComposition) return null;

    const options = composition.options.map((option, index) => ({
      value: index.toString(),
      label: getSchemaOptionDisplayName(option, index)
    }));

    return (
      <div class="ml-4 my-2">
        <div class="flex items-center gap-2 text-xs">
          <span class="text-gray-600">{getCompositionDisplayName(composition.type)}:</span>
          <Select
            value={selectedCompositionIndex.toString()}
            onChange={(value) => setSelectedCompositionIndex(parseInt(value, 10))}
            options={options}
            size="small"
            className="min-w-0 flex-1"
          />
        </div>
      </div>
    );
  };

  const renderExpandButton = () => {
    if (!hasChildren) return null;

    return (
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        class="flex items-center justify-center w-4 h-4 mr-2 text-gray-500 hover:text-gray-700 cursor-pointer"
      >
        <svg
          class={`w-3 h-3 transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    );
  };

  const renderDescription = () => {
    const parentDescription = schema.description;
    const effectiveDescription = effectiveSchema.description;

    // If composition field, show parent description first, then effective description
    if (composition.hasComposition) {
      const hasParentDesc = parentDescription && parentDescription.trim();
      const hasEffectiveDesc = effectiveDescription && effectiveDescription.trim();

      if (!hasParentDesc && !hasEffectiveDesc) {
        return <div class="h-1"></div>;
      }

      return (
        <div>
          {hasParentDesc && (
            <div class="text-xs text-gray-600 leading-relaxed [&_.prose]:text-xs [&_.prose]:text-gray-600 [&_.prose_p]:text-gray-600 [&_.prose_li]:text-gray-600 [&_.prose_*]:text-gray-600">
              <MarkdownPreview markdown={parentDescription} />
            </div>
          )}
          {hasParentDesc && hasEffectiveDesc && (
            <div class="h-2"></div>
          )}
          {hasEffectiveDesc && (
            <div class="text-xs text-gray-600 leading-relaxed [&_.prose]:text-xs [&_.prose]:text-gray-600 [&_.prose_p]:text-gray-600 [&_.prose_li]:text-gray-600 [&_.prose_*]:text-gray-600">
              <MarkdownPreview markdown={effectiveDescription} />
            </div>
          )}
        </div>
      );
    }

    // Non-composition field: show description as before
    const description = effectiveSchema.description;
    if (!description || !description.trim()) {
      return <div class="h-1"></div>;
    }

    return (
      <div class="text-xs text-gray-600 leading-relaxed [&_.prose]:text-xs [&_.prose]:text-gray-600 [&_.prose_p]:text-gray-600 [&_.prose_li]:text-gray-600 [&_.prose_*]:text-gray-600">
        <MarkdownPreview markdown={description} />
      </div>
    );
  };

  const renderChildren = () => {
    if (!hasChildren || !isExpanded) return null;

    if (effectiveSchema.type === 'object' && effectiveSchema.properties) {
      const required = effectiveSchema.required || [];

      return (
        <div class="ml-2 border-l border-gray-200 pl-4 space-y-2">
          {Object.entries(effectiveSchema.properties).map(([propName, propSchema]) => (
            <SchemaTree
              key={propName}
              schema={propSchema}
              name={propName}
              level={level + 1}
              isRequired={required.includes(propName)}
            />
          ))}
        </div>
      );
    }

    if (effectiveSchema.type === 'array' && effectiveSchema.items) {
      return (
        <div class="ml-2 border-l border-gray-200 pl-4">
          <SchemaTree
            schema={effectiveSchema.items}
            name="[item]"
            level={level + 1}
            isRequired={false}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div class={`${className}`}>
      <div class="flex items-start">
        <div class="flex-shrink-0" style={{ width: hasChildren ? 'auto' : '0' }}>
          {renderExpandButton()}
        </div>
        <div class="flex-1 min-w-0">
          {name && (
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-gray-900">
                {name}
                {isRequired && <span class="text-red-500 ml-1">*</span>}
              </span>
              <span class={`px-1 py-0.5 text-[10px]/[12px] rounded ${getTypeBadgeColor(effectiveSchema.type)}`}>
                {getTypeDisplay(effectiveSchema)}
              </span>
            </div>
          )}
          {renderDescription()}
        </div>
      </div>

      {composition.hasComposition && renderCompositionSelector()}
      {renderChildren()}
    </div>
  );
}

// Helper component for rendering a schema object with proper root styling
export function SchemaTreeRoot({ schema, title, className = '' }) {
  if (!schema) {
    return (
      <div class={`text-sm text-gray-500 italic ${className}`}>
        No schema available
      </div>
    );
  }

  return (
    <div class={`space-y-2 ${className}`}>
      {title && (
        <h4 class="text-xs font-medium text-gray-600 tracking-wide">
          {title}
        </h4>
      )}
      <div class="text-sm">
        <SchemaTree schema={schema} />
      </div>
    </div>
  );
}
