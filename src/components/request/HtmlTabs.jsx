// Component for HTML tab navigation
export const HtmlTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'preview', label: 'Preview' },
    { id: 'code', label: 'Code' }
  ];

  return (
    <div class="mb-4">
      <div class="border-b border-gray-200 dark:border-neutral-dark-300 px-4 overflow-x-auto scrollbar-hide -mx-4">
        <div class="flex space-x-2 flex-nowrap min-w-max">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              class={`px-4 py-2 text-xs rounded-t-md font-medium focus:outline-none cursor-pointer ${activeTab === tab.id
                ? 'text-sky-600 bg-sky-50 border-b-2 border-sky-600'
                : 'text-gray-600 dark:text-neutral-dark-600 hover:text-sky-600 hover:bg-gray-100 dark:hover:bg-neutral-dark-200'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};