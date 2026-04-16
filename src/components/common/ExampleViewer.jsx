import { useState, useEffect } from 'preact/hooks';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { EditorView } from '@codemirror/view';
import { bracketMatching } from '@codemirror/language';
import { Select } from './Select';

export function ExampleViewer({
  examples = [],
  title = "Examples",
  contentType = "application/json",
  className = ""
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when examples change
  useEffect(() => {
    if (examples.length > 0 && selectedIndex >= examples.length) {
      setSelectedIndex(0);
    }
  }, [examples, selectedIndex]);

  if (!examples || examples.length === 0) {
    return null;
  }

  const selectedExample = examples[selectedIndex] || examples[0];

  // Get CodeMirror extensions based on content type and content shape
  const getExtensions = (formattedContent) => {
    const baseExtensions = [
      bracketMatching(),
      EditorView.theme({
        "&": {
          minHeight: "120px",
        },
        ".cm-content, .cm-gutter": {
          minHeight: "120px !important"
        },
        ".cm-scroller": {
          overflow: "auto",
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        }
      }),
      EditorView.editable.of(false)
    ];

    const isXml = contentType.includes('application/xml') || contentType.includes('text/xml');
    const isJson = contentType.includes('json') ||
      (!isXml && /^\s*[{\[]/.test(formattedContent));

    if (isJson) return [...baseExtensions, json()];
    if (isXml) return [...baseExtensions, xml()];
    return baseExtensions;
  };

  // Format the example content for display
  const formatContent = (content) => {
    if (typeof content === 'string') {
      try {
        // Try to parse and pretty-print JSON
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, 2);
      } catch {
        // Return as-is if not valid JSON
        return content;
      }
    } else if (typeof content === 'object') {
      return JSON.stringify(content, null, 2);
    }
    return String(content);
  };

  // Create dropdown options
  const dropdownOptions = examples.map((example, index) => ({
    value: index.toString(),
    label: example.name || example.summary || `Example ${index + 1}`
  }));

  const formattedContent = formatContent(selectedExample.value !== undefined ? selectedExample.value : selectedExample);
  const displayTitle = title || (examples.length === 1 ? (selectedExample.name || selectedExample.summary || '') : '');

  return (
    <div class={`space-y-2 ${className}`}>
      {displayTitle && (
        <div class="flex items-center justify-between">
          <label class="block text-xs font-medium text-gray-400">{displayTitle}</label>
        </div>
      )}

      {examples.length > 1 && (
        <Select
          value={selectedIndex.toString()}
          onChange={(value) => setSelectedIndex(parseInt(value, 10))}
          options={dropdownOptions}
          placeholder="Select example..."
          size="small"
        />
      )}

      <CodeMirror
        value={formattedContent}
        extensions={getExtensions(formattedContent)}
        theme={dracula}
        editable={false}
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
          fontSize: '11px',
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        }}
      />
    </div>
  );
}