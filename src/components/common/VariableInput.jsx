import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { useAppContext } from '../../hooks/useAppContext';
import { apiClient } from '../../api';
import { Portal } from './Portal';

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
  inputType = 'text', // Support for different input types like 'url'
  showResolved = false, // Show resolved variable values below the input
  fullyResolvedUrl = null, // Fully resolved URL with variables, path params, and query params
  ...props
}) {
  const { selectedCollection, hasManuallySelectedEnvironment } = useAppContext();
  const [variables, setVariables] = useState(new Map());
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [filteredVariables, setFilteredVariables] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [autocompleteStart, setAutocompleteStart] = useState(-1);

  const inputRef = useRef();
  const autocompleteRef = useRef();
  const updateTimeoutRef = useRef();
  const hoverTimerRef = useRef(null);
  const hoverCardRef = useRef(null);
  const [hoverState, setHoverState] = useState(null);

  // Load variables when collection or selected environment changes
  useEffect(() => {
    loadVariables();
  }, [selectedCollection, selectedEnvironment, hasManuallySelectedEnvironment]);

  const loadVariables = async () => {
    const vars = new Map();

    try {
      // Collection variables (inline)
      if (selectedCollection?.variables) {
        selectedCollection.variables.forEach(v => vars.set(v.key, { value: v.value, type: 'variable' }));
      }

      // Database collection variables
      if (selectedCollection?.id) {
        const collectionVars = await apiClient.getSecretsByCollection(selectedCollection.id);
        collectionVars.forEach(v => vars.set(v.key, { value: v.value, type: 'variable' }));
      }

      // Environment variables - use selectedEnvironment prop if provided,
      // otherwise fall back to collection's default environment only if user hasn't manually selected
      const environmentId = selectedEnvironment?.id || (!hasManuallySelectedEnvironment ? selectedCollection?.environment_id : null);
      if (environmentId) {
        const envVars = await apiClient.getDecryptedEnvironmentSecrets(environmentId);
        envVars.forEach(v => vars.set(v.key, { value: v.value, type: 'secret' }));
      }
    } catch (error) {
      console.error('Failed to load variables:', error);
    }

    setVariables(vars);
  };

  // Resolve variables in text by replacing {{variable}} with actual values
  const resolveVariables = useCallback((text) => {
    if (!text) return '';

    const variableRegex = /\{\{([^}]*)\}\}/g;
    return text.replace(variableRegex, (match, variableName) => {
      const entry = variables.get(variableName);
      if (entry) return entry.value ?? entry;
      return match;
    });
  }, [variables]);

  // Parse and highlight variables in the text
  const parseAndHighlight = useCallback((text) => {
    if (!text) return { __html: '' };

    const variableRegex = /\{\{([^}]*)\}\}/g;
    let lastIndex = 0;
    const parts = [];
    let match;

    // Helper function to escape HTML and preserve spaces
    const escapeAndPreserveSpaces = (str) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\s/g, '&nbsp;'); // Preserve all whitespace
    };

    while ((match = variableRegex.exec(text)) !== null) {
      // Add text before the variable
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        parts.push(escapeAndPreserveSpaces(beforeText));
      }

      // Add the variable with highlighting
      const variableName = match[1];
      const isResolved = variables.has(variableName);
      const className = isResolved ? 'variable-resolved' : 'variable-unresolved';

      parts.push(`<span class="${className}">${escapeAndPreserveSpaces(match[0])}</span>`);
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(escapeAndPreserveSpaces(text.slice(lastIndex)));
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

    // Check for {{ pattern for autocomplete immediately (no setTimeout needed)
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
  };

  // Get cursor position in contenteditable element
  const getCursorPosition = (element) => {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return 0;

    const range = selection.getRangeAt(0);

    // Create a range from the start of the element to the cursor
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    // Get the text content before the cursor, converting &nbsp; back to spaces
    const textBeforeCursor = preCaretRange.toString().replace(/\u00a0/g, ' ');

    return textBeforeCursor.length;
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

    // Find the correct text node and offset, handling &nbsp; entities
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while ((node = walker.nextNode())) {
      // Convert &nbsp; back to regular spaces for length calculation
      const nodeText = node.textContent.replace(/\u00a0/g, ' ');
      const nodeLength = nodeText.length;

      if (currentPosition + nodeLength >= position) {
        targetNode = node;
        targetOffset = position - currentPosition;
        break;
      }
      currentPosition += nodeLength;
    }

    if (targetNode) {
      // Ensure offset doesn't exceed node length
      targetOffset = Math.min(targetOffset, targetNode.textContent.length);

      try {
        range.setStart(targetNode, targetOffset);
        range.setEnd(targetNode, targetOffset);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (error) {
        // Fallback: position at the end of the element
        range.selectNodeContents(element);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  const handleMouseOver = (e) => {
    const target = e.target;
    if (!target.classList?.contains('variable-resolved')) return;
    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      const rawText = target.textContent.replace(/\u00a0/g, " ");
      const nameMatch = rawText.match(/^\{\{(.+)\}\}$/);
      if (!nameMatch) return;
      const entry = variables.get(nameMatch[1]);
      if (!entry) return;
      const rect = target.getBoundingClientRect();
      setHoverState({ variableName: nameMatch[1], type: entry.type, value: entry.value, position: { top: rect.bottom + 6, left: rect.left } });
    }, 400);
  };

  const handleMouseOut = (e) => {
    if (!e.target.classList?.contains('variable-resolved')) return;
    clearTimeout(hoverTimerRef.current);
    if (!hoverCardRef.current?.contains(e.relatedTarget)) {
      setHoverState(null);
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
    // Capture focus state before any DOM mutation so we never steal the cursor
    // from a different focused input when an external value change triggers this effect.
    const isActive = document.activeElement === element;
    const currentCursor = isActive ? getCursorPosition(element) : 0;
    const currentText = element.textContent || '';

    // Clear any pending update
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Only update if content actually differs to avoid unnecessary DOM manipulation
    if (currentText !== value) {
      const highlighted = parseAndHighlight(value);

      // Check if the highlighted HTML is actually different to avoid flicker
      if (element.innerHTML !== highlighted.__html) {
        element.innerHTML = highlighted.__html;

        // Only restore cursor when this input is the active element
        if (isActive) {
          requestAnimationFrame(() => {
            if (document.activeElement === element) {
              setCursorPosition(element, Math.min(currentCursor, value.length));
            }
          });
        }
      }
    } else {
      // Content matches, but highlighting might need update (e.g., variables changed)
      const highlighted = parseAndHighlight(value);
      if (element.innerHTML !== highlighted.__html) {
        element.innerHTML = highlighted.__html;

        // Only restore cursor when this input is the active element
        if (isActive) {
          requestAnimationFrame(() => {
            if (document.activeElement === element) {
              setCursorPosition(element, currentCursor);
            }
          });
        }
      }
    }

    // Cleanup function
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
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
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        data-placeholder={placeholder}
        className={`variable-input ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        suppressContentEditableWarning={true}
        inputMode={inputType === 'url' ? 'url' : undefined}
        spellCheck={inputType === 'url' ? false : undefined}
        {...props}
      />

      {showAutocomplete && filteredVariables.length > 0 && (
        <div
          ref={autocompleteRef}
          class="absolute z-50 bg-white dark:bg-surface-dark-elevated rounded-md shadow-lg ring-1 ring-black/5 dark:ring-white/10 max-h-48 overflow-y-auto"
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
              class={`px-3 py-2 cursor-pointer text-sm ${index === selectedIndex
                ? 'bg-sky-100 dark:bg-primary-dark-200 text-sky-900 dark:text-primary-dark-400'
                : 'text-gray-700 dark:text-neutral-dark-700 hover:bg-gray-100 dark:hover:bg-neutral-dark-200'
                }`}
              onClick={() => insertVariable(variableName)}
            >
              <div class="flex items-center gap-1.5">
                <span class="font-medium">{variableName}</span>
                <span class="text-xs text-gray-500 dark:text-neutral-dark-500">
                  &middot; {variables.get(variableName)?.type === 'secret' ? 'secret' : 'variable'}
                </span>
              </div>
              {variables.has(variableName) && (
                <div class="text-xs text-gray-500 dark:text-neutral-dark-500 truncate mt-1">
                  {String(variables.get(variableName)?.value ?? '').slice(0, 50)}
                  {String(variables.get(variableName)?.value ?? '').length > 50 ? '...' : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {hoverState && (
        <Portal>
          <div
            ref={hoverCardRef}
            class="fixed z-50 rounded-md border border-gray-200 dark:border-neutral-dark-300 bg-white dark:bg-surface-dark-elevated shadow-md text-gray-900 dark:text-neutral-dark-900"
            style={{ top: `${hoverState.position.top}px`, left: `${hoverState.position.left}px`, maxWidth: '240px', minWidth: '160px' }}
            onMouseLeave={() => { clearTimeout(hoverTimerRef.current); setHoverState(null); }}
          >
            <div class="px-4 pt-3 pb-2">
              <p class="text-xs font-semibold text-gray-500 dark:text-neutral-dark-500 uppercase tracking-wide">
                {hoverState.type === 'secret' ? 'Secret' : 'Variable'}
              </p>
            </div>
            <hr class="border-gray-200 dark:border-neutral-dark-300" />
            <div class="px-4 py-3">
              <p class="text-xs break-all font-mono">
                {hoverState.value}
              </p>
            </div>
          </div>
        </Portal>
      )}

      {(() => {
        const hasVariables = value && value.includes('{{');
        const hasPathParams = value && (/:[a-zA-Z_]/.test(value) || /\{(?!\{)/.test(value));
        const hasQueryParams = value && value.includes('?');
        const shouldShow = showResolved && (hasVariables || hasPathParams || hasQueryParams) && (fullyResolvedUrl || value);

        return shouldShow && (
          <p class="mt-1 text-xs text-gray-500 dark:text-neutral-dark-500 truncate">
            {fullyResolvedUrl || resolveVariables(value)}
          </p>
        );
      })()}

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

        .dark .variable-input {
          border-color: #44475a;
          background: #282a36;
          color: #f8f8f2;
        }

        .dark .variable-input:focus {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }

        .dark .variable-input[data-placeholder]:empty::before {
          color: #6272a4;
        }

        .dark .variable-resolved {
          background-color: #1a3a28;
          color: #50fa7b;
        }

        .dark .variable-unresolved {
          background-color: #3a1a1a;
          color: #ff5555;
        }
      `}</style>
    </div>
  );
}
