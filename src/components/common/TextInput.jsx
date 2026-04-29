import { useState, forwardRef } from 'preact/compat';
import { Copy } from 'lucide-preact';
import { Toast, useToast } from './Toast';

/**
 * TextInput Component
 *
 * A reusable text input component with support for:
 * - Text, password, URL input types, textarea, and file input
 * - Optional clear button (X icon)
 * - Password visibility toggle (eye icon)
 * - Proper icon grouping when both are present
 * - Optional description text below the input
 * - Standard input attributes (placeholder, disabled, etc.)
 * - Ref forwarding for focus management
 * - Textarea mode with configurable rows
 * - File input with accept and multiple attributes
 */
export const TextInput = forwardRef(({
  type = 'text',
  value = '',
  onChange,
  onInput,
  placeholder = '',
  disabled = false,
  clearable = false,
  showCopyButton = false,
  description = '',
  className = '',
  id,
  required = false,
  rows = 3,
  accept,
  multiple = false,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [inputType, setInputType] = useState(type);
  const [toastVisible, showToast, hideToast] = useToast();
  const isTextarea = type === 'textarea';
  const isFile = type === 'file';

  // Update input type when type prop changes
  if (type !== inputType && type !== 'password') {
    setInputType(type);
  }

  const handleChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  const handleInput = (e) => {
    if (onInput) {
      onInput(e);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (disabled) return;

    // Create a synthetic event for consistency
    const syntheticEvent = {
      target: { value: '' },
      currentTarget: { value: '' }
    };

    if (onChange) {
      onChange(syntheticEvent);
    }
    if (onInput) {
      onInput(syntheticEvent);
    }
  };

  const togglePasswordVisibility = (e) => {
    e.stopPropagation();
    if (disabled) return;

    setShowPassword(!showPassword);
    setInputType(showPassword ? 'password' : 'text');
  };

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!value) return;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(value);
    } else {
      const el = document.createElement('textarea');
      el.value = value;
      el.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    showToast();
  };

  const isPassword = type === 'password';
  const hasValue = value && value.length > 0;
  const showClearButton = clearable && hasValue && !disabled && !isTextarea && !isFile;
  const showEyeIcon = isPassword && !disabled;
  const showCopyIcon = showCopyButton && !isTextarea && !isFile;
  const hasRightIcons = showClearButton || showEyeIcon || showCopyIcon;

  // Calculate padding based on which icons are shown
  const iconCount = [showClearButton, showEyeIcon, showCopyIcon].filter(Boolean).length;
  let rightPadding = 'pr-7';
  if (iconCount >= 2) {
    rightPadding = 'pr-[72px]';
  } else if (iconCount === 1) {
    rightPadding = 'pr-[40px]';
  }

  const baseInputClasses = `block w-full rounded-md px-3 py-2 ${disabled ? 'bg-gray-50 dark:bg-neutral-dark-200' : 'bg-white dark:bg-[#282a36]'} text-gray-900 dark:text-neutral-dark-900 outline-solid outline-1 focus:outline-2 -outline-offset-1 outline-gray-300 dark:outline-neutral-dark-50 placeholder:text-gray-400 dark:placeholder:text-neutral-dark-400 focus:-outline-offset-2 focus:outline-sky-500 text-sm`;

  return (
    <div class="w-full">
      <div class="relative w-full">
        {isTextarea ? (
          <textarea
            ref={ref}
            id={id}
            value={value}
            onChange={handleChange}
            onInput={handleInput}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            rows={rows}
            class={`${baseInputClasses} ${className}`}
            {...props}
          />
        ) : isFile ? (
          <input
            ref={ref}
            id={id}
            type="file"
            onChange={handleChange}
            disabled={disabled}
            required={required}
            accept={accept}
            multiple={multiple}
            class={`${baseInputClasses} ${className}`}
            {...props}
          />
        ) : (
          <input
            ref={ref}
            id={id}
            type={inputType}
            value={value}
            onChange={handleChange}
            onInput={handleInput}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            class={`${baseInputClasses} ${rightPadding} ${className}`}
            {...props}
          />
        )}

        {hasRightIcons && (
          <div class="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
            {showClearButton && (
              <button
                type="button"
                onClick={handleClear}
                class="p-1 text-gray-400 hover:text-gray-600 dark:text-neutral-dark-400 dark:hover:text-neutral-dark-600 rounded-sm focus:outline-hidden cursor-pointer transition-colors"
                aria-label="Clear input"
                tabIndex={-1}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}

            {showCopyIcon && (
              <button
                type="button"
                onClick={handleCopy}
                class="p-1 text-gray-400 hover:text-gray-600 dark:text-neutral-dark-400 dark:hover:text-neutral-dark-600 rounded-sm focus:outline-hidden cursor-pointer transition-colors"
                aria-label="Copy to clipboard"
                tabIndex={-1}
              >
                <Copy class="h-4 w-4" />
              </button>
            )}

            {showEyeIcon && (
              <button
                type="button"
                onClick={togglePasswordVisibility}
                class="p-1 text-gray-400 hover:text-gray-600 dark:text-neutral-dark-400 dark:hover:text-neutral-dark-600 rounded-sm focus:outline-hidden cursor-pointer transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  // Eye-off icon (password visible, click to hide)
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  // Eye icon (password hidden, click to show)
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {description && (
        <p class="mt-1 text-xs text-gray-500 dark:text-neutral-dark-500">
          {description}
        </p>
      )}

      <Toast
        message="Copied to clipboard."
        isVisible={toastVisible}
        onClose={hideToast}
        type="success"
      />
    </div>
  );
});

TextInput.displayName = 'TextInput';
