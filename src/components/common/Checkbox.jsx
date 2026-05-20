/**
 * Checkbox Component
 *
 * A checkbox input component that matches the primary button color scheme (sky-500).
 *
 * @param {Object} props
 * @param {boolean} [props.checked=false] - Whether the checkbox is checked
 * @param {boolean} [props.disabled=false] - Whether the checkbox is disabled
 * @param {Function} [props.onChange] - Change handler
 * @param {string} [props.label] - Label text for the checkbox
 * @param {string} [props.description] - Additional descriptive text shown below the label
 * @param {string} [props.name] - Name attribute for the input
 * @param {string} [props.value] - Value attribute for the input
 * @param {string} [props.className] - Additional CSS classes for the container
 * @param {string} [props.id] - ID for the input element
 * @param {Object} [props...rest] - Other HTML input attributes
 */
export function Checkbox({
  checked = false,
  disabled = false,
  onChange,
  label,
  description,
  name,
  value,
  className = '',
  id,
  ...rest
}) {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  const handleChange = (e) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div class={`flex items-start ${className}`}>
      <input
        type="checkbox"
        id={checkboxId}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        class={`
          h-4 w-4 rounded border-gray-300 dark:border-neutral-dark-50
          text-sky-500
          focus:ring-2 focus:ring-sky-500 focus:ring-offset-0
          disabled:cursor-not-allowed disabled:opacity-50
          cursor-pointer
          transition-colors
        `}
        {...rest}
      />
      {(label || description) && (
        <div class="ml-2 flex flex-col -mt-0.5">
          {label && (
            <label
              for={checkboxId}
              class={`
                text-sm text-gray-600 dark:text-neutral-dark-600
                ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
              `}
            >
              {label}
            </label>
          )}
          {description && (
            <span
              class={`
                text-xs text-gray-500 dark:text-neutral-dark-500 mt-1
                ${disabled ? 'cursor-not-allowed opacity-50' : ''}
              `}
            >
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
