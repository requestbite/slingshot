import { Link } from 'wouter-preact';

/**
 * ClickableCard Component
 *
 * A clickable card component that resembles a small moldable card container.
 * Useful for navigation or selection interfaces.
 *
 * @param {Object} props
 * @param {string} props.href - The URL/route to navigate to when clicked
 * @param {string} props.title - The card title
 * @param {string} [props.description] - Optional description text
 * @param {preact.ComponentChildren} [props.icon] - Optional icon element to display on the left
 * @param {string} [props.className] - Additional CSS classes
 * @param {Function} [props.onClick] - Optional click handler
 * @param {Object} [props...rest] - Other HTML anchor attributes
 */
export function ClickableCard({
  href,
  title,
  description,
  icon,
  className = '',
  onClick,
  ...rest
}) {
  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      class={`block bg-white rounded-lg border border-gray-300 p-4 transition-colors hover:bg-gray-50 cursor-pointer ${className}`}
      {...rest}
    >
      <div class="flex items-start">
        {icon && (
          <div class="flex-shrink-0 mr-3 text-gray-500">
            {icon}
          </div>
        )}
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-semibold text-gray-900 truncate">
            {title}
          </h3>
          {description && (
            <p class="mt-1 text-xs text-gray-600 line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
