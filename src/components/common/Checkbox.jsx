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
    <div class={`flex items-center ${className}`}>
      <input
        type="checkbox"
        id={checkboxId}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        class={`
          h-4 w-4 rounded border-gray-300
          text-sky-500
          focus:ring-2 focus:ring-sky-500 focus:ring-offset-0
          disabled:cursor-not-allowed disabled:opacity-50
          cursor-pointer
          transition-colors
        `}
        {...rest}
      />
      {label && (
        <label
          for={checkboxId}
          class={`
            ml-2 text-sm text-gray-600
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          `}
        >
          {label}
        </label>
      )}
    </div>
  );
}
