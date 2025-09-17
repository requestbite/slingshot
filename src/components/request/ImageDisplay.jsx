import { useState, useEffect } from 'preact/hooks';

// Component for displaying images with CodeMirror-style frame
export const ImageDisplay = ({ response }) => {
  const [imageError, setImageError] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  // Create image URL from binary data
  useEffect(() => {
    if (!response.binaryData) {
      setImageError(true);
      return;
    }

    try {
      // Get content type
      const contentTypeHeader = response.headers?.find(h =>
        h.name && h.name.toLowerCase() === 'content-type'
      );
      const mimeType = contentTypeHeader?.value.split(';')[0].trim() || 'image/png';

      // Convert base64 to blob
      const binaryString = atob(response.binaryData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setImageUrl(url);

      // Cleanup function
      return () => {
        if (url) URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.error('Failed to create image URL:', error);
      setImageError(true);
    }
  }, [response.binaryData, response.headers]);

  if (imageError || !imageUrl) {
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
          Failed to load image
        </div>
      </div>
    );
  }

  return (
    <div
      class="rounded-md p-4 text-center"
      style={{
        border: '1px solid #44475a',
        backgroundColor: '#282a36',
        minHeight: '200px'
      }}
    >
      <img
        src={imageUrl}
        alt="Response content"
        onError={() => setImageError(true)}
        style={{
          maxWidth: '100%',
          height: 'auto',
          borderRadius: '4px'
        }}
      />
    </div>
  );
};