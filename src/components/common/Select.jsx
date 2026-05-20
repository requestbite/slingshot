import { useId } from 'preact/hooks';

export function Select({
  id,
  value,
  onChange,
  options = [],
  disabled = false,
  placeholder = "Select...",
  description = '',
  className = "",
  size = "normal" // "normal" or "small"
}) {
  const generatedId = useId();
  const selectId = id || generatedId;

  const sizeClasses = size === "small"
    ? "py-1 px-2 text-xs"
    : "py-2 px-3 text-sm";

  const baseClasses = `w-full appearance-none rounded-md bg-white dark:bg-[#282a36] pr-8 text-gray-900 dark:text-neutral-dark-900 outline-solid outline-1 focus:outline-2 -outline-offset-1 outline-gray-300 dark:outline-neutral-dark-50 focus:-outline-offset-2 focus:outline-sky-500 ${sizeClasses}`;

  return (
    <div class="w-full">
      <div class={`relative ${className}`}>
        <select
          id={selectId}
          class={baseClasses}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          {placeholder && (
            <option value="" disabled={options.length > 0}>
              {disabled ? 'Loading...' : placeholder}
            </option>
          )}
          {options.map((option, index) => (
            <option key={option.value || index} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          class="pointer-events-none absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 dark:text-neutral-dark-500 h-4 w-4"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
            clip-rule="evenodd"
          />
        </svg>
      </div>

      {description && (
        <p class="mt-1.5 text-xs text-gray-500 dark:text-neutral-dark-500">
          {description}
        </p>
      )}
    </div>
  );
}
