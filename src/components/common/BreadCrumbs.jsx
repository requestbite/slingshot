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
    <nav class={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      <ol class="flex items-center space-x-2">
        {items.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === items.length - 1;
          const isClickable = item.href && !isLast;

          return (
            <li key={index} class="flex items-center space-x-2">
              {index > 0 && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="text-gray-400"
                  aria-hidden="true"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              )}

              {isFirst ? (
                // Home icon for first item
                isClickable ? (
                  <a
                    href={item.href}
                    class="text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label="Home"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
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
                  </a>
                ) : (
                  <span class="text-gray-500" aria-label="Home">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
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
                  <a
                    href={item.href}
                    class="text-gray-500 hover:text-gray-700 hover:underline transition-colors"
                  >
                    {item.name}
                  </a>
                ) : (
                  <span class={isLast ? 'text-gray-900 font-medium' : 'text-gray-500'}>
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
