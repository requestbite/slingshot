export function Alert({ type = 'note', children, className = '' }) {
  const config = {
    note: {
      bgColor: 'bg-sky-100 dark:bg-primary-dark-200',
      textColor: 'text-sky-700 dark:text-primary-dark-400',
      borderColor: '',
      iconColor: 'text-sky-700 dark:text-primary-dark-400',
      icon: (
        <svg class="size-6 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 16v-4"></path>
          <path d="M12 8h.01"></path>
        </svg>
      )
    },
    tip: {
      bgColor: 'bg-lime-50 dark:bg-success-dark-50',
      textColor: 'text-lime-700 dark:text-success-dark-400',
      borderColor: 'border-lime-600 dark:border-success-dark-400 border-2',
      iconColor: 'text-lime-600 dark:text-success-dark-400',
      icon: (
        <svg class="size-6 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="m9 12 2 2 4-4"></path>
        </svg>
      )
    },
    important: {
      bgColor: 'bg-purple-50 dark:bg-info-dark-50',
      textColor: 'text-purple-700 dark:text-info-dark-600',
      borderColor: '',
      iconColor: 'text-purple-600 dark:text-info-dark-600',
      icon: (
        <svg class="size-6 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path>
          <path d="M12 9v4"></path>
          <path d="M12 17h.01"></path>
        </svg>
      )
    },
    warning: {
      bgColor: 'bg-amber-50 dark:bg-warning-dark-50',
      textColor: 'text-amber-700 dark:text-warning-dark-600',
      borderColor: 'border-amber-600 dark:border-warning-dark-600 border-2',
      iconColor: 'text-amber-600 dark:text-warning-dark-600',
      icon: (
        <svg class="size-6 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path>
          <path d="M12 9v4"></path>
          <path d="M12 17h.01"></path>
        </svg>
      )
    },
    caution: {
      bgColor: 'bg-red-50 dark:bg-error-dark-50',
      textColor: 'text-red-700 dark:text-error-dark-400',
      borderColor: 'border-red-600 dark:border-error-dark-400 border-2',
      iconColor: 'text-red-600 dark:text-error-dark-400',
      icon: (
        <svg class="size-6 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
          <path d="m15 9-6 6"></path>
          <path d="m9 9 6 6"></path>
        </svg>
      )
    }
  };

  const alertConfig = config[type] || config.note;

  return (
    <div class={`flex gap-x-3 rounded-md p-3.5 text-sm/6 w-full ${alertConfig.bgColor} ${alertConfig.textColor} ${alertConfig.borderColor} ${className}`}>
      <div class={`self-center ${alertConfig.iconColor}`}>
        {alertConfig.icon}
      </div>
      <div class="flex-1">
        {children}
      </div>
    </div>
  );
}
