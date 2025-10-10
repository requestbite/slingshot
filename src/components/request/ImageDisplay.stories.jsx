import { ImageDisplay } from './ImageDisplay';

export default {
  title: 'Request/ImageDisplay',
  component: ImageDisplay,
  tags: ['autodocs'],
};

// Create a simple 1x1 pixel PNG in base64
const samplePNGBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Create sample response with image data
const createImageResponse = (base64Data, mimeType = 'image/png') => ({
  binaryData: base64Data,
  headers: [
    { name: 'content-type', value: mimeType },
    { name: 'content-length', value: '1234' }
  ]
});

// PNG image
export const PNGImage = {
  args: {
    response: createImageResponse(samplePNGBase64, 'image/png'),
  },
};

// Image load error
export const ImageLoadError = {
  args: {
    response: {
      binaryData: 'invalid-base64-data',
      headers: [
        { name: 'content-type', value: 'image/png' }
      ]
    },
  },
};

// Missing binary data
export const MissingBinaryData = {
  args: {
    response: {
      headers: [
        { name: 'content-type', value: 'image/png' }
      ]
    },
  },
};

// In container
export const InContainer = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <h3 class="text-lg font-semibold mb-4">Image Response</h3>
      <ImageDisplay response={createImageResponse(samplePNGBase64)} />
    </div>
  ),
};

// Note about real images
export const Note = {
  render: () => (
    <div class="p-4 max-w-2xl">
      <div class="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
        <h4 class="text-sm font-semibold text-blue-900 mb-2">Note</h4>
        <p class="text-sm text-blue-800">
          The ImageDisplay component renders images from base64-encoded binary data returned
          by API responses. The examples here use a minimal 1x1 pixel image for demonstration.
        </p>
        <p class="text-sm text-blue-800 mt-2">
          In a real application, this component would display:
        </p>
        <ul class="list-disc list-inside text-sm text-blue-800 mt-1">
          <li>PNG images</li>
          <li>JPEG images</li>
          <li>GIF images</li>
          <li>WebP images</li>
          <li>SVG images</li>
        </ul>
      </div>

      <ImageDisplay response={createImageResponse(samplePNGBase64)} />
    </div>
  ),
};
