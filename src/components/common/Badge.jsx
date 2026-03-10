/**
 * Badge Component
 *
 * A small label component for displaying statuses, categories, or counts.
 *
 * @param {Object} props
 * @param {string} [props.variant='primary'] - Badge variant: 'primary', 'secondary', 'danger', 'utility', 'success', 'ghost', 'none'
 * @param {string} [props.className] - Additional CSS classes (can override colors)
 * @param {preact.ComponentChildren} props.children - Badge content
 * @param {Object} [props...rest] - Other HTML span attributes
 */
export function Badge({
  variant = 'primary',
  className = '',
  children,
  ...rest
}) {
  if (variant === 'none') {
    return (
      <span class={className} {...rest}>
        {children}
      </span>
    );
  }

  const baseClasses = 'inline-flex items-center rounded px-2.5 py-0.5 text-xs font-semibold border';

  const variantClasses = {
    primary: 'bg-sky-500 text-white border-white',
    secondary: 'bg-white text-gray-900 border-gray-500',
    ghost: 'text-sky-600 bg-sky-50 border-sky-300',
    danger: 'bg-red-100 text-red-700 border-red-300',
    utility: 'bg-gray-100 text-gray-700 border-gray-300',
    success: 'bg-green-100 text-green-700 border-green-300',
  };

  const badgeClasses = `${baseClasses} ${variantClasses[variant] ?? variantClasses.primary} ${className}`;

  return (
    <span class={badgeClasses} {...rest}>
      {children}
    </span>
  );
}
