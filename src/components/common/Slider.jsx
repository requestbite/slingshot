/**
 * Slider Component
 *
 * A custom range slider input with consistent styling across all browsers.
 * Replicates Firefox's native range input appearance.
 *
 * @param {Object} props
 * @param {string} [props.id] - Input id attribute
 * @param {number} [props.value] - Current slider value
 * @param {number} [props.min=0] - Minimum value
 * @param {number} [props.max=100] - Maximum value
 * @param {number} [props.step=1] - Step increment
 * @param {Function} [props.onInput] - Callback when value changes (receives event)
 * @param {Function} [props.onChange] - Callback when value changes (receives event)
 * @param {boolean} [props.disabled=false] - Whether the slider is disabled
 * @param {string} [props.description] - Helper text displayed below the slider
 * @param {string} [props.className] - Additional CSS classes
 */
export function Slider({
  id,
  value = 0,
  min = 0,
  max = 100,
  step = 1,
  onInput,
  onChange,
  disabled = false,
  description,
  className = '',
  ...props
}) {
  return (
    <div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={onInput}
        onChange={onChange}
        disabled={disabled}
        class={`slider ${className}`}
        {...props}
      />
      {description && (
        <p class="mt-1.5 text-xs text-gray-500 dark:text-neutral-dark-500">
          {description}
        </p>
      )}
    </div>
  );
}
