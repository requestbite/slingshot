/**
 * Label Component
 *
 * A reusable label component with support for:
 * - Standard label functionality with htmlFor attribute
 * - Optional mandatory indicator (red asterisk)
 * - Optional description text below the label
 * - Consistent styling across the application
 */
export function Label({
  children,
  htmlFor,
  mandatory = false,
  description = '',
  className = '',
  ...props
}) {
  return (
    <div class="w-full">
      <label
        for={htmlFor}
        class={`block text-sm font-medium text-gray-700 dark:text-neutral-dark-700 mb-1.5 ${className}`}
        {...props}
      >
        {children}
        {mandatory && (
          <span class="text-red-500"> *</span>
        )}
      </label>
      {description && (
        <p class="-mt-1 mb-2 text-xs text-gray-500 dark:text-neutral-dark-500">
          {description}
        </p>
      )}
    </div>
  );
}
