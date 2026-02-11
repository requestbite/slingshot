/**
 * Button Component
 *
 * A versatile button component that supports multiple variants, sizes, and states.
 *
 * @param {Object} props
 * @param {string} [props.variant='primary'] - Button variant: 'primary', 'secondary', 'ghost', 'icon', 'danger', 'utility', 'success', 'link', 'none'
 * @param {string} [props.size='md'] - Button size: 'xs', 'sm', 'md', 'icon'
 * @param {boolean} [props.disabled=false] - Whether the button is disabled
 * @param {boolean} [props.loading=false] - Whether the button is in loading state
 * @param {string} [props.type='button'] - HTML button type
 * @param {Function} [props.onClick] - Click handler
 * @param {string} [props.className] - Additional CSS classes
 * @param {preact.ComponentChildren} props.children - Button content
 * @param {Object} [props...rest] - Other HTML button attributes
 */
export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  className = '',
  children,
  ...rest
}) {
  // For 'link' variant, apply link-like styling (no padding, no outline, font-normal)
  if (variant === 'link') {
    const linkClasses = `inline-flex items-center justify-center text-sky-500 hover:text-sky-700 hover:underline transition-colors cursor-pointer font-normal disabled:opacity-50 disabled:cursor-not-allowed ${className}`;

    return (
      <button
        type={type}
        class={linkClasses}
        disabled={disabled || loading}
        onClick={(e) => {
          if (disabled || loading) {
            e.preventDefault();
            return;
          }
          if (onClick) {
            onClick(e);
          }
        }}
        {...rest}
      >
        {loading && (
          <svg
            class="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }

  // For 'none' variant, only apply className and no base styling
  if (variant === 'none') {
    return (
      <button
        type={type}
        class={className}
        disabled={disabled || loading}
        onClick={(e) => {
          if (disabled || loading) {
            e.preventDefault();
            return;
          }
          if (onClick) {
            onClick(e);
          }
        }}
        {...rest}
      >
        {loading && (
          <svg
            class="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }

  // Base classes that apply to all buttons (font weight varies by size)
  const fontWeight = size === 'xs' ? 'font-normal' : 'font-semibold';
  const baseClasses = `inline-flex items-center justify-center rounded-md ${fontWeight} focus-visible:outline-solid focus-visible:outline-1 focus-visible:outline-offset-2 transition-colors cursor-pointer`;

  // Variant-specific classes
  const variantClasses = {
    primary: 'bg-sky-500 text-white hover:bg-sky-400 focus-visible:outline-sky-500 disabled:bg-sky-300 disabled:cursor-not-allowed',
    secondary: 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-gray-500 disabled:opacity-50 disabled:cursor-not-allowed',
    ghost: 'text-sky-500 hover:text-sky-700 hover:underline focus-visible:outline-sky-500 disabled:opacity-50 disabled:cursor-not-allowed',
    icon: 'bg-sky-100 text-sky-700 hover:bg-sky-200 focus-visible:outline-sky-500 disabled:opacity-50 disabled:cursor-not-allowed',
    danger: 'bg-red-100 text-red-700 hover:bg-red-200 focus-visible:outline-red-500 disabled:opacity-50 disabled:cursor-not-allowed',
    utility: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 focus-visible:outline-gray-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
    success: 'bg-green-100 text-green-700 hover:bg-green-200 focus-visible:outline-green-500 disabled:opacity-50 disabled:cursor-not-allowed'
  };

  // Size-specific classes
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-3 py-2 text-sm',
    icon: 'h-[30px] w-[30px] p-0 text-sm'
  };

  // Combine all classes
  const buttonClasses = `${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${sizeClasses[size] || sizeClasses.md} ${className}`;

  // Handle click event
  const handleClick = (e) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      class={buttonClasses}
      disabled={disabled || loading}
      onClick={handleClick}
      {...rest}
    >
      {loading && (
        <svg
          class="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
