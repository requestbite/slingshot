/**
 * Tabs Component
 *
 * A tab navigation bar with active, inactive, and disabled states.
 *
 * @param {Object} props
 * @param {Array<{id: string, label: string, disabled?: boolean}>} props.tabs - Tab definitions
 * @param {string} props.activeTab - The id of the currently active tab
 * @param {Function} props.onTabChange - Called with the tab id when a tab is clicked
 * @param {string} [props.className] - Additional CSS classes for the container
 */
export function Tabs({ tabs, activeTab, onTabChange, className = '' }) {
  return (
    <div class={`border-b border-gray-200 overflow-x-auto scrollbar-hide ${className}`}>
      <div class="flex space-x-1 flex-nowrap min-w-max">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled = tab.disabled === true;

          let tabClass = 'px-4 py-2 text-xs rounded-t-md font-medium focus:outline-none ';

          if (isDisabled) {
            tabClass += 'text-gray-400 cursor-not-allowed';
          } else if (isActive) {
            tabClass += 'text-sky-600 bg-sky-50 border-b-2 border-sky-600 cursor-pointer';
          } else {
            tabClass += 'text-gray-600 hover:text-sky-600 hover:bg-gray-100 cursor-pointer';
          }

          return (
            <button
              key={tab.id}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onTabChange(tab.id)}
              class={tabClass}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
