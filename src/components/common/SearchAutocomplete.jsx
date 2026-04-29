import { useState, useEffect, useRef, forwardRef } from 'preact/compat';
import { TextInput } from './TextInput';

/**
 * SearchAutocomplete Component
 *
 * A search input with autocomplete dropdown functionality featuring:
 * - Keyboard navigation (Arrow Up/Down, Enter, Escape, Tab)
 * - Click-outside detection
 * - Both synchronous (items prop) and asynchronous (onSearch callback) data support
 * - Custom item rendering via renderItem prop
 * - Styling consistent with TextInput component
 * - Proper z-index stacking and positioning
 *
 * @example
 * // Synchronous usage with items prop
 * <SearchAutocomplete
 *   value={query}
 *   onChange={(e) => setQuery(e.target.value)}
 *   items={apiList}
 *   onSelect={(item) => console.log('Selected:', item)}
 *   renderItem={(item) => <div>{item.name}</div>}
 *   placeholder="Search APIs..."
 * />
 *
 * @example
 * // Asynchronous usage with onSearch callback
 * <SearchAutocomplete
 *   value={query}
 *   onChange={(e) => setQuery(e.target.value)}
 *   onSearch={async (query) => await fetchResults(query)}
 *   onSelect={(item) => console.log('Selected:', item)}
 *   renderItem={(item) => <div>{item.name}</div>}
 *   placeholder="Search APIs..."
 * />
 */
export const SearchAutocomplete = forwardRef((
  {
    value = '',
    onChange,
    onSelect,
    items = [],
    onSearch,
    renderItem,
    placeholder = '',
    clearable = true,
    loading = false,
    disabled = false,
    className = '',
    id,
    minChars = 1,
    maxResults = 10,
    debounceMs = 300,
    emptyMessage = 'No results found',
    ...props
  },
  ref
) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filteredItems, setFilteredItems] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Handle synchronous filtering (when items prop is provided)
  useEffect(() => {
    if (!onSearch && items.length > 0) {
      if (value.length >= minChars) {
        const query = value.toLowerCase();
        const filtered = items
          .filter((item) => {
            // Support string items or objects with common searchable properties
            if (typeof item === 'string') {
              return item.toLowerCase().includes(query);
            }
            // Search in common properties
            const searchText = [
              item.name,
              item.title,
              item.label,
              item.description,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();
            return searchText.includes(query);
          })
          .slice(0, maxResults);

        setFilteredItems(filtered);
        setShowDropdown(true);
      } else {
        setFilteredItems([]);
        setShowDropdown(false);
      }
      setSelectedIndex(-1);
    }
  }, [value, items, onSearch, minChars, maxResults]);

  // Handle asynchronous search (when onSearch callback is provided)
  useEffect(() => {
    if (onSearch && value.length >= minChars) {
      // Clear any pending debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set up debounced search
      debounceTimerRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const results = await onSearch(value);
          const limited = results.slice(0, maxResults);
          setFilteredItems(limited);
          setShowDropdown(true);
          setSelectedIndex(-1);
        } catch (error) {
          console.error('Search error:', error);
          setFilteredItems([]);
          setShowDropdown(false);
        } finally {
          setIsSearching(false);
        }
      }, debounceMs);
    } else if (onSearch) {
      setFilteredItems([]);
      setShowDropdown(false);
      setSelectedIndex(-1);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, onSearch, minChars, maxResults, debounceMs]);

  // Click-outside detection
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex]);

  const handleInputChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  const handleItemSelect = (item, index) => {
    if (onSelect) {
      onSelect(item, index);
    }
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || filteredItems.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredItems[selectedIndex]) {
          handleItemSelect(filteredItems[selectedIndex], selectedIndex);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;

      case 'Tab':
        // Close dropdown on tab but allow default tab behavior
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleInputFocus = () => {
    // Show dropdown if there are filtered items and enough characters
    if (filteredItems.length > 0 && value.length >= minChars) {
      setShowDropdown(true);
    }
  };

  const isLoading = loading || isSearching;
  const shouldShowEmptyMessage =
    !isLoading &&
    value.length >= minChars &&
    filteredItems.length === 0 &&
    showDropdown;

  return (
    <div ref={containerRef} class="relative w-full">
      <TextInput
        ref={ref}
        id={id}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        disabled={disabled}
        clearable={clearable}
        className={className}
        autoComplete="off"
        {...props}
      />

      {/* Dropdown */}
      {(showDropdown || shouldShowEmptyMessage || isLoading) && (
        <div
          class="absolute w-full bg-white dark:bg-surface-dark-elevated border border-gray-300 dark:border-neutral-dark-50 rounded-md shadow-lg mt-1 z-50 max-h-[300px] overflow-y-auto"
          style={{
            top: '100%',
            left: '0',
          }}
        >
          {isLoading ? (
            <div class="px-3 py-2 text-sm text-gray-500 dark:text-neutral-dark-500 text-center">
              Searching...
            </div>
          ) : shouldShowEmptyMessage ? (
            <div class="px-3 py-2 text-sm text-gray-500 text-center italic">
              {emptyMessage}
            </div>
          ) : (
            <ul ref={dropdownRef} class="py-1">
              {filteredItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <li
                    key={index}
                    onClick={() => handleItemSelect(item, index)}
                    class={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-sky-100 dark:bg-primary-dark-200 text-sky-900 dark:text-primary-dark-400'
                        : 'text-gray-900 dark:text-neutral-dark-900 hover:bg-gray-100 dark:hover:bg-neutral-dark-200'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    {renderItem ? renderItem(item, index) : String(item)}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
});

SearchAutocomplete.displayName = 'SearchAutocomplete';
