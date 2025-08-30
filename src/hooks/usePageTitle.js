import { useEffect } from 'preact/hooks';

export function usePageTitle(title) {
  useEffect(() => {
    if (title) {
      document.title = `${title} - RequestBite Slingshot`;
    } else {
      document.title = 'RequestBite Slingshot';
    }

    // Cleanup function to reset to default when component unmounts
    return () => {
      document.title = 'RequestBite Slingshot';
    };
  }, [title]);
}
