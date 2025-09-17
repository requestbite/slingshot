import { useState } from 'preact/hooks';

// Component for displaying HTML content in an iframe
export const HtmlPreview = ({ response }) => {
  const [iframeError, setIframeError] = useState(false);

  if (iframeError || !response.responseData) {
    return (
      <div
        class="rounded-md p-4 text-center text-gray-600"
        style={{
          border: '1px solid #44475a',
          backgroundColor: '#282a36',
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div class="text-white">
          Failed to load HTML preview
        </div>
      </div>
    );
  }

  return (
    <div
      class="rounded-md outline-gray-300 flex-grow"
      style={{
        border: '1px solid #d1d5db',
        padding: '3px',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: '200px'
      }}
    >
      <iframe
        srcdoc={response.responseData}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '0.375rem',
          flex: '1 1 auto'
        }}
        sandbox="allow-same-origin allow-scripts allow-forms"
        onError={() => setIframeError(true)}
      />
    </div>
  );
};