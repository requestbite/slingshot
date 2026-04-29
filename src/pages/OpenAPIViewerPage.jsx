import { useState, useEffect } from 'preact/hooks';
import { Label } from '../components/common/Label';
import { Button } from '../components/common/Button';
import { TextInput } from '../components/common/TextInput';
import { Toast, useToast } from '../components/common/Toast';
import { OpenAPIViewer, getEndpointId } from '../components/common/OpenAPIViewer';
import { OpenAPINavPanel } from '../components/common/OpenAPINavPanel';
import { fetchFromURL } from '../utils/urlImporter';

// Isolated so keystrokes don't re-render the parent (and the heavy OpenAPIViewer tree)
function SpecUrlBar({ initialUrl = '', isLoading, onLoad }) {
  const [url, setUrl] = useState(initialUrl);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) onLoad(url.trim());
  };

  return (
    <form onSubmit={handleSubmit} class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <TextInput
        type="url"
        placeholder="https://example.com/openapi.json"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={isLoading}
      />
      <Button type="submit" variant="primary" disabled={isLoading || !url.trim()} className="sm:flex-shrink-0 w-full sm:w-auto">
        {isLoading && (
          <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        Open
      </Button>
    </form>
  );
}

export function OpenAPIViewerPage() {
  const [initialUrl] = useState(() => new URLSearchParams(window.location.search).get('spec') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedSpec, setParsedSpec] = useState(null);
  const [activeEndpointId, setActiveEndpointId] = useState(null);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [toastVisible, showToast, hideToast] = useToast();
  const [toastMessage, setToastMessage] = useState('');

  const loadSpec = async (specUrl) => {
    setIsLoading(true);

    try {
      const { content } = await Promise.race([
        fetchFromURL(specUrl),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('OpenAPI spec download timed out')), 10000)
        )
      ]);

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        const { load: loadYAML } = await import('js-yaml');
        parsed = loadYAML(content);
      }

      if (!parsed || (!parsed.openapi && !parsed.swagger)) {
        throw new Error('Link doesn\'t point to a valid OpenAPI spec.');
      }

      setParsedSpec(parsed);

      const pageUrl = new URL(window.location);
      pageUrl.searchParams.set('spec', specUrl);
      window.history.replaceState({}, '', pageUrl.toString());
    } catch (err) {
      setToastMessage(err.message || 'Failed to load OpenAPI spec');
      showToast();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialUrl) loadSpec(initialUrl);
  }, []);

  if (parsedSpec) {
    return (
      <div
        class="bg-gray-100 dark:bg-[#282a36] overflow-y-auto"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <div class="min-h-full pt-[83px] pb-6">
          {/* URL bar */}
          <div class="max-w-3xl mx-auto px-4 mb-4">
            <SpecUrlBar initialUrl={initialUrl} isLoading={isLoading} onLoad={loadSpec} />
          </div>

          {/* Mobile nav toggle */}
          <button
            onClick={() => setIsNavOpen(true)}
            class={`fixed top-1/2 -left-1 transform -translate-y-1/2 z-[50] bg-sky-100 dark:bg-sky-200 hover:bg-sky-200 dark:hover:bg-sky-300 text-sky-700 p-2 rounded-r-lg shadow-lg cursor-pointer transition-all duration-200 hover:translate-x-1 ${isNavOpen ? 'hidden' : 'block lg:hidden'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m6 17 5-5-5-5" />
              <path d="m13 17 5-5-5-5" />
            </svg>
          </button>

          {/* Mobile nav overlay + slide-in */}
          {isNavOpen && (
            <>
              <div
                class="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/60 z-[60] lg:hidden animate-fade-in"
                onClick={() => setIsNavOpen(false)}
              />
              <div class="fixed left-0 top-0 bottom-0 right-[75px] bg-white dark:bg-surface-dark-elevated z-[70] lg:hidden overflow-y-auto animate-slide-in-left">
                <OpenAPINavPanel
                  spec={parsedSpec}
                  activeId={activeEndpointId}
                  onSelect={(method, path) => {
                    setActiveEndpointId(getEndpointId(method, path));
                    setIsNavOpen(false);
                  }}
                />
              </div>
            </>
          )}

          <div class="px-4 flex items-start gap-4">
            {/* Left nav — desktop only */}
            <div class="hidden lg:flex flex-col w-64 flex-shrink-0 bg-white dark:bg-surface-dark-elevated rounded-lg border border-gray-300 dark:border-neutral-dark-50 overflow-hidden">
              <OpenAPINavPanel
                spec={parsedSpec}
                activeId={activeEndpointId}
                onSelect={(method, path) => setActiveEndpointId(getEndpointId(method, path))}
              />
            </div>

            {/* Right viewer */}
            <div class="flex-1 min-w-0 bg-white dark:bg-surface-dark-elevated rounded-lg border border-gray-300 dark:border-neutral-dark-50">
              <OpenAPIViewer spec={parsedSpec} />
            </div>
          </div>
        </div>

        <Toast
          message={toastMessage}
          isVisible={toastVisible}
          onClose={hideToast}
          type="error"
          duration={5000}
        />
      </div>
    );
  }

  return (
    <>
      <div class="w-full max-w-lg px-4 sm:px-0">
      <div class="relative overflow-hidden rounded-lg bg-white dark:bg-surface-dark-elevated border border-gray-300 dark:border-neutral-dark-50 px-4 pb-4 pt-5 text-left sm:p-6">
        <h3 class="text-base font-semibold text-gray-900 dark:text-neutral-dark-900">OpenAPI Spec Viewer</h3>
        <p class="mt-2 text-sm text-gray-500 dark:text-neutral-dark-500">
          Provide a link to a publicly available OpenAPI spec in YAML or JSON format to render the documentation here.
        </p>

        <div class="mt-6">
          <Label htmlFor="openapi-url">Link to OpenAPI spec</Label>
          <SpecUrlBar initialUrl={initialUrl} isLoading={isLoading} onLoad={loadSpec} />
        </div>
      </div>
      </div>

      <Toast
        message={toastMessage}
        isVisible={toastVisible}
        onClose={hideToast}
        type="error"
        duration={5000}
      />
    </>
  );
}
