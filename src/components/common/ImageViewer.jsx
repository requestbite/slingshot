import { useState, useRef, useEffect } from 'preact/hooks';

/**
 * ImageViewer Component
 *
 * A browser-based image viewer that allows users to upload an image
 * with drag-and-drop or file selection. Unlike ScreenshotEditor, this
 * component shows a compact preview within the drop zone instead of
 * replacing the entire UI.
 *
 * @param {Object} props
 * @param {File} [props.value] - Controlled file value
 * @param {Function} [props.onChange] - Callback when file changes (receives File object or null)
 * @param {string} [props.className] - Additional CSS classes
 */
export function ImageViewer({
  value = null,
  src = null,
  onChange,
  variant = 'default',
  className = ''
}) {
  const readonly = variant === 'readonly';
  const [selectedImage, setSelectedImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Sync internal state with value prop
  useEffect(() => {
    if (value && value instanceof File) {
      setFileName(value.name);
      setSelectedImage(value);

      // Create preview URL from the File object
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviewUrl(e.target.result);
      };
      reader.readAsDataURL(value);
    } else if (value === null) {
      // Clear state if value is explicitly null
      setSelectedImage(null);
      setFileName('');
      setImagePreviewUrl(null);
    }
  }, [value]);

  // Handle file selection
  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(png|jpeg|jpg|webp|svg\+xml)$/)) {
      alert('Please select a PNG, JPEG, WebP, or SVG image file.');
      return;
    }

    setFileName(file.name);
    setSelectedImage(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);

    // Call onChange callback if provided
    if (onChange) {
      onChange(file);
    }
  };

  // Handle drag and drop events
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Handle click to select file
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Handle remove
  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedImage(null);
    setFileName('');
    setImagePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Call onChange callback with null
    if (onChange) {
      onChange(null);
    }
  };

  if (readonly) {
    const displayUrl = imagePreviewUrl || src;
    return (
      <div class={`w-full ${className}`}>
        <div class="relative border-2 border-dashed rounded-lg p-8 text-center border-gray-300 bg-gray-50">
          {displayUrl && (
            <div class="mx-auto w-32 h-32 bg-gray-300 p-2 rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src={displayUrl}
                alt={fileName}
                class="max-w-full max-h-full object-contain"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div class={`w-full ${className}`}>
      <div
        class={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${isDragging
          ? 'border-sky-500 bg-sky-50'
          : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
          onChange={handleFileInputChange}
          class="hidden"
        />

        {!selectedImage ? (
          <>
            <svg
              class="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>

            <div class="mt-4">
              <p class="text-sm font-semibold text-gray-900">
                Drop your image here, or click to select
              </p>
              <p class="mt-1 text-xs text-gray-500">
                PNG, JPEG, WebP, or SVG files
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Image Preview */}
            <div class="mx-auto w-32 h-32 bg-gray-300 p-2 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
              <img
                src={imagePreviewUrl}
                alt={fileName}
                class="max-w-full max-h-full object-contain"
              />
            </div>

            <div class="mt-4">
              <p class="text-sm font-semibold text-gray-900">
                Drop new image here or click to replace.{' '}
                <a
                  href="#"
                  onClick={handleRemove}
                  class="text-sky-600 hover:text-sky-700 underline"
                >
                  Remove
                </a>
                .
              </p>
              <p class="mt-1 text-xs text-gray-500">
                {fileName}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
