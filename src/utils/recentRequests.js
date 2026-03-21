const STORAGE_KEY = 'slingshot_recent_req';
const MAX_ENTRIES = 10;

export function trackRecentRequest(id) {
  if (!id) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let list = raw ? JSON.parse(raw) : [];
    list = list.filter(entry => entry !== id); // deduplicate
    list.unshift(id);                          // newest at top
    list = list.slice(0, MAX_ENTRIES);         // cap at 10
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    console.warn('Failed to update recent requests:', error);
  }
}
