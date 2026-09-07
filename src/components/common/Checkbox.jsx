import { Check, Minus } from 'lucide-preact';

/**
 * Checkbox Component
 *
 * A custom-styled checkbox that borrows the border/background treatment from
 * TextInput and fills with the primary Button color (sky-500) plus a lucide
 * "check" icon when checked (or a "minus" icon when indeterminate).
 *
 * @param {Object} props
 * @param {boolean} [props.checked=false] - Whether the checkbox is checked
 * @param {boolean} [props.indeterminate=false] - Show the mixed/partial state (e.g. "select all")
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
  indeterminate = false,
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
      <div class="relative h-4 w-4 shrink-0">
        <input
          type="checkbox"
          id={checkboxId}
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          ref={(el) => { if (el) el.indeterminate = indeterminate; }}
          onChange={handleChange}
          class={`
            peer absolute inset-0 m-0 h-full w-full appearance-none
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
          {...rest}
        />
        <div
          class={`
            pointer-events-none flex h-4 w-4 items-center justify-center rounded-md
            outline-solid outline-1 -outline-offset-1 transition-colors
            ${checked || indeterminate
              ? 'bg-sky-500 outline-sky-500'
              : 'bg-white dark:bg-[#282a36] outline-gray-300 dark:outline-neutral-dark-50'}
            peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-sky-500
            ${disabled ? 'opacity-50' : ''}
          `}
        >
          {checked
            ? <Check class="h-3 w-3 text-white" strokeWidth={3} />
            : indeterminate
              ? <Minus class="h-3 w-3 text-white" strokeWidth={3} />
              : null}
        </div>
      </div>
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
