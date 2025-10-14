/**
 * Label Component
 *
 * A reusable label component with support for:
 * - Standard label functionality with htmlFor attribute
 * - Optional mandatory indicator (red asterisk)
 * - Consistent styling across the application
 */
export function Label({
  children,
  htmlFor,
  mandatory = false,
  className = '',
  ...props
}) {
  return (
    <label
      for={htmlFor}
      class={`block text-sm font-medium text-gray-700 mb-1.5 ${className}`}
      {...props}
    >
      {children}
      {mandatory && (
        <span class="text-red-500"> *</span>
      )}
    </label>
  );
}
