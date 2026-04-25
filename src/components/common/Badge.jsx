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
    secondary: 'bg-white dark:bg-surface-dark-elevated text-gray-900 dark:text-neutral-dark-900 border-gray-500 dark:border-neutral-dark-50',
    ghost: 'text-sky-600 dark:text-primary-dark-400 bg-sky-50 dark:bg-primary-dark-200 border-sky-300 dark:border-primary-dark-300',
    danger: 'bg-red-100 dark:bg-error-dark-100 text-red-700 dark:text-error-dark-400 border-red-300 dark:border-error-dark-200',
    utility: 'bg-gray-100 dark:bg-neutral-dark-200 text-gray-700 dark:text-neutral-dark-700 border-gray-300 dark:border-neutral-dark-50',
    success: 'bg-green-100 dark:bg-success-dark-100 text-green-700 dark:text-success-dark-400 border-green-300 dark:border-success-dark-200',
  };

  const badgeClasses = `${baseClasses} ${variantClasses[variant] ?? variantClasses.primary} ${className}`;

  return (
    <span class={badgeClasses} {...rest}>
      {children}
    </span>
  );
}
