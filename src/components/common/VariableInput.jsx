import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { useAppContext } from '../../hooks/useAppContext';
import { apiClient } from '../../api';

/**
 * Enhanced input component with variable highlighting and autocomplete
 * Highlights {{variable}} patterns with green (resolved) or red (unresolved) backgrounds
 * Shows autocomplete dropdown when user types {{
 */
export function VariableInput({
  value = '',
  onChange,
  onKeyDown,
  placeholder = '',
  className = '',
  disabled = false,
  selectedEnvironment = null, // Override for current environment selection
  ...props
}) {
  const { selectedCollection } = useAppContext();
  const [variables, setVariables] = useState(new Map());
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [filteredVariables, setFilteredVariables] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [autocompleteStart, setAutocompleteStart] = useState(-1);
  
  const inputRef = useRef();
  const autocompleteRef = useRef();

  // Load variables when collection or selected environment changes
  useEffect(() => {
    loadVariables();
  }, [selectedCollection, selectedEnvironment]);

  const loadVariables = async () => {
    const vars = new Map();
    
    try {
      // Collection variables (inline)
      if (selectedCollection?.variables) {
        selectedCollection.variables.forEach(v => vars.set(v.key, v.value));
      }
      
      // Database collection variables
      if (selectedCollection?.id) {
        const collectionVars = await apiClient.getSecretsByCollection(selectedCollection.id);
        collectionVars.forEach(v => vars.set(v.key, v.value));
      }
      
      // Environment variables - use selectedEnvironment prop if provided, 
      // otherwise fall back to collection's default environment
      const environmentId = selectedEnvironment?.id || selectedCollection?.environment_id;
      if (environmentId) {
        const envVars = await apiClient.getDecryptedEnvironmentSecrets(environmentId);
        envVars.forEach(v => vars.set(v.key, v.value));
      }
    } catch (error) {
      console.error('Failed to load variables:', error);
    }
    
    setVariables(vars);
  };

  // Parse and highlight variables in the text
  const parseAndHighlight = useCallback((text) => {
    if (!text) return { __html: '' };
    
    const variableRegex = /\{\{([^}]*)\}\}/g;
    let lastIndex = 0;
    const parts = [];
    let match;

    while ((match = variableRegex.exec(text)) !== null) {
      // Add text before the variable
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        parts.push(beforeText);
      }

      // Add the variable with highlighting
      const variableName = match[1];
      const isResolved = variables.has(variableName);
      const className = isResolved ? 'variable-resolved' : 'variable-unresolved';
      
      parts.push(`<span class="${className}">${match[0]}</span>`);
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return { __html: parts.join('') };
  }, [variables]);

  // Handle input changes
  const handleInput = (e) => {
    const newValue = e.target.textContent || '';
    
    // Store cursor position before onChange (which triggers re-render)
    const cursorPosition = getCursorPosition(e.target);
    
    // Update the value
    onChange?.(newValue);

    // Check for {{ pattern for autocomplete after a short delay to let DOM settle
    setTimeout(() => {
      const textBeforeCursor = newValue.slice(0, cursorPosition);
      const variableMatch = textBeforeCursor.match(/\{\{([^}]*)$/);

      if (variableMatch) {
        const query = variableMatch[1];
        const startPos = cursorPosition - query.length - 2; // -2 for {{
        
        setAutocompleteQuery(query);
        setAutocompleteStart(startPos);
        
        // Filter variables based on query
        const filtered = Array.from(variables.keys())
          .filter(key => key.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 10); // Limit to 10 results
        
        setFilteredVariables(filtered);
        setSelectedIndex(0);
        
        if (filtered.length > 0) {
          setShowAutocomplete(true);
        } else {
          setShowAutocomplete(false);
        }
      } else {
        setShowAutocomplete(false);
      }
    }, 0);
  };

  // Get cursor position in contenteditable element
  const getCursorPosition = (element) => {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return 0;
    
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    
    return preCaretRange.toString().length;
  };


  // Handle keyboard events
  const handleKeyDown = (e) => {
    if (showAutocomplete && filteredVariables.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredVariables.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredVariables.length - 1
          );
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          e.stopPropagation();
          insertVariable(filteredVariables[selectedIndex]);
          return; // Don't call onKeyDown if we handled autocomplete
        case 'Escape':
          e.preventDefault();
          setShowAutocomplete(false);
          break;
      }
    }
    
    onKeyDown?.(e);
  };

  // Insert selected variable
  const insertVariable = (variableName) => {
    if (!variableName || !inputRef.current) return;
    
    const element = inputRef.current;
    const currentText = element.textContent || '';
    
    // Replace the partial {{ with the complete variable
    const beforeInsert = currentText.slice(0, autocompleteStart);
    const afterInsert = currentText.slice(getCursorPosition(element));
    const newText = beforeInsert + `{{${variableName}}}` + afterInsert;
    
    // Update DOM content directly to avoid re-render issues
    element.textContent = newText;
    
    // Update the content and trigger change
    onChange?.(newText);
    
    // Set cursor position after the inserted variable (at the very end)
    const newCursorPos = beforeInsert.length + variableName.length + 4; // +4 for {{}}
    setCursorPosition(element, newCursorPos);
    
    setShowAutocomplete(false);
  };

  // Set cursor position in contenteditable element
  const setCursorPosition = (element, position) => {
    const range = document.createRange();
    const selection = window.getSelection();
    
    let currentPosition = 0;
    let targetNode = null;
    let targetOffset = 0;

    // Find the correct text node and offset
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while ((node = walker.nextNode())) {
      const nodeLength = node.textContent.length;
      if (currentPosition + nodeLength >= position) {
        targetNode = node;
        targetOffset = position - currentPosition;
        break;
      }
      currentPosition += nodeLength;
    }

    if (targetNode) {
      range.setStart(targetNode, targetOffset);
      range.setEnd(targetNode, targetOffset);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  // Handle clicking outside to close autocomplete
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showAutocomplete && 
          autocompleteRef.current && 
          !autocompleteRef.current.contains(e.target) &&
          !inputRef.current.contains(e.target)) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAutocomplete]);

  // Update highlighting without affecting cursor position
  useEffect(() => {
    if (!inputRef.current || showAutocomplete) return;
    
    const element = inputRef.current;
    const currentCursor = getCursorPosition(element);
    const currentText = element.textContent || '';
    
    // Update DOM content if it differs from the prop value
    if (currentText !== value) {
      const highlighted = parseAndHighlight(value);
      element.innerHTML = highlighted.__html;
      // Restore cursor position, but set to end if value was externally changed (like restore)
      setTimeout(() => {
        setCursorPosition(element, Math.min(currentCursor, value.length));
      }, 0);
    } else {
      // Content matches, but highlighting might need update (e.g., variables changed)
      const highlighted = parseAndHighlight(value);
      if (element.innerHTML !== highlighted.__html) {
        element.innerHTML = highlighted.__html;
        // Restore cursor position
        setTimeout(() => {
          setCursorPosition(element, currentCursor);
        }, 0);
      }
    }
  }, [value, variables, showAutocomplete]);

  // Set initial content
  useEffect(() => {
    if (inputRef.current && !inputRef.current.textContent && value) {
      inputRef.current.innerHTML = parseAndHighlight(value).__html;
    }
  }, []);

  return (
    <div class="relative">
      <div
        ref={inputRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        className={`variable-input ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        suppressContentEditableWarning={true}
        {...props}
      />
      
      {showAutocomplete && filteredVariables.length > 0 && (
        <div
          ref={autocompleteRef}
          class="absolute z-50 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto"
          style={{
            top: '100%',
            left: '0',
            marginTop: '2px',
            minWidth: '200px'
          }}
        >
          {filteredVariables.map((variableName, index) => (
            <div
              key={variableName}
              class={`px-3 py-2 cursor-pointer text-sm ${
                index === selectedIndex 
                  ? 'bg-sky-100 text-sky-900' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => insertVariable(variableName)}
            >
              <div class="flex items-center">
                <span class="font-medium">{variableName}</span>
              </div>
              {variables.has(variableName) && (
                <div class="text-xs text-gray-500 truncate mt-1">
                  {String(variables.get(variableName)).slice(0, 50)}
                  {String(variables.get(variableName)).length > 50 ? '...' : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <style jsx>{`
        .variable-input {
          min-height: 38px;
          max-height: 38px;
          height: 38px;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          font-size: 14px;
          line-height: 22px;
          outline: none;
          transition: border-color 0.15s ease-in-out;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        
        .variable-input:focus {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }
        
        .variable-input[data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        
        .variable-resolved {
          background-color: #dcfce7;
          color: #166534;
          padding: 1px 3px;
          border-radius: 3px;
          font-weight: 500;
        }
        
        .variable-unresolved {
          background-color: #fef2f2;
          color: #dc2626;
          padding: 1px 3px;
          border-radius: 3px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}