import { Link } from 'wouter-preact';

/**
 * BreadCrumbs Component
 *
 * A breadcrumb navigation component that shows the user's current location in the app hierarchy.
 * The first item is always represented by a home icon.
 *
 * @param {Object} props
 * @param {Array<{name: string, href?: string}>} props.items - Array of breadcrumb items. First item should be "Home".
 * @param {string} [props.className] - Additional CSS classes
 */
export function BreadCrumbs({ items, className = '' }) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav class={`flex items-center text-xs overflow-hidden ${className}`} aria-label="Breadcrumb">
      <ol class="flex items-center space-x-2 min-w-0 overflow-hidden">
        {items.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === items.length - 1;
          const isClickable = item.href && !isLast;

          return (
            <li key={index} class={`flex items-center space-x-2 flex-shrink-0${isLast ? ' min-w-0 truncate' : ''}`}>
              {index > 0 && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="text-gray-400 dark:text-neutral-dark-400"
                  aria-hidden="true"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              )}

              {isFirst ? (
                // Home icon for first item
                isClickable ? (
                  <Link
                    href={item.href}
                    class="text-gray-500 dark:text-neutral-dark-500 hover:text-gray-700 dark:hover:text-neutral-dark-700 transition-colors"
                    aria-label="Home"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </Link>
                ) : (
                  <span class="text-gray-500 dark:text-neutral-dark-500" aria-label="Home">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </span>
                )
              ) : (
                // Regular text for other items
                isClickable ? (
                  <Link
                    href={item.href}
                    class="text-gray-500 dark:text-neutral-dark-500 hover:text-gray-700 dark:hover:text-neutral-dark-700 hover:underline transition-colors"
                  >
                    {item.name}
                  </Link>
                ) : (
                  <span class={isLast ? 'text-gray-900 dark:text-neutral-dark-900 font-medium truncate' : 'text-gray-500 dark:text-neutral-dark-500 whitespace-nowrap'}>
                    {item.name}
                  </span>
                )
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
