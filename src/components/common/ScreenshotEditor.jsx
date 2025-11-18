import { useState, useRef, useEffect } from 'preact/hooks';
import { Button } from './Button';
import { ContextMenu } from './ContextMenu';

/**
 * ScreenshotEditor Component
 *
 * A browser-based screenshot editor that allows users to upload an image
 * and render it on a canvas with customizable gradient background, margins,
 * border radius, and drop shadow effects.
 *
 * @param {Object} props
 * @param {number} [props.width=1500] - Canvas width in pixels
 * @param {number} [props.margin=80] - Padding around the image in pixels
 * @param {number} [props.borderRadius=20] - Border radius of the image in pixels
 * @param {number} [props.shadowBlur=40] - Shadow blur radius in pixels
 * @param {number} [props.shadowOffsetX=0] - Shadow horizontal offset in pixels
 * @param {number} [props.shadowOffsetY=10] - Shadow vertical offset in pixels
 * @param {string} [props.shadowColor='rgba(0,0,0,0.3)'] - Shadow color
 * @param {string} [props.gradientStartColor='#667eea'] - Gradient start color
 * @param {string} [props.gradientEndColor='#764ba2'] - Gradient end color
 * @param {string} [props.gradientDirection='left'] - Gradient direction: 'top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'
 * @param {string} [props.className] - Additional CSS classes
 */
export function ScreenshotEditor({
  width = 1500,
  margin = 80,
  borderRadius = 20,
  shadowBlur = 40,
  shadowOffsetX = 0,
  shadowOffsetY = 10,
  shadowColor = 'rgba(0,0,0,0.3)',
  gradientStartColor = '#667eea',
  gradientEndColor = '#764ba2',
  gradientDirection = 'left',
  className = ''
}) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [baseFileName, setBaseFileName] = useState('');
  const [imageKey, setImageKey] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [showExportContextMenu, setShowExportContextMenu] = useState(false);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const exportButtonRef = useRef(null);

  // Handle file selection
  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/)) {
      alert('Please select a PNG, JPEG, or WebP image file.');
      return;
    }

    setFileName(file.name);

    // Extract base filename without extension
    const lastDotIndex = file.name.lastIndexOf('.');
    const baseName = lastDotIndex > 0 ? file.name.substring(0, lastDotIndex) : file.name;
    setBaseFileName(baseName);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setSelectedImage(img);
        setImageKey(prev => prev + 1);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
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

  // Render canvas when image or props change
  useEffect(() => {
    if (!selectedImage || !canvasRef.current) return;

    // Ensure image is fully loaded before rendering
    if (!selectedImage.complete) {
      selectedImage.onload = () => {
        setImageKey(prev => prev + 1);
      };
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Calculate canvas dimensions
    const imageWidth = width - (margin * 2);
    const imageHeight = (selectedImage.height / selectedImage.width) * imageWidth;
    const canvasHeight = Math.round(imageHeight + (margin * 2));

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = canvasHeight;
    setCanvasHeight(canvasHeight);

    // Clear canvas
    ctx.clearRect(0, 0, width, canvasHeight);

    // Draw gradient background
    let gradient;
    switch (gradientDirection) {
      case 'top':
        gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        break;
      case 'bottom':
        gradient = ctx.createLinearGradient(0, canvasHeight, 0, 0);
        break;
      case 'left':
        gradient = ctx.createLinearGradient(0, 0, width, 0);
        break;
      case 'right':
        gradient = ctx.createLinearGradient(width, 0, 0, 0);
        break;
      case 'top-left':
        gradient = ctx.createLinearGradient(0, 0, width, canvasHeight);
        break;
      case 'top-right':
        gradient = ctx.createLinearGradient(width, 0, 0, canvasHeight);
        break;
      case 'bottom-left':
        gradient = ctx.createLinearGradient(0, canvasHeight, width, 0);
        break;
      case 'bottom-right':
        gradient = ctx.createLinearGradient(width, canvasHeight, 0, 0);
        break;
      default:
        gradient = ctx.createLinearGradient(0, 0, width, 0);
    }

    gradient.addColorStop(0, gradientStartColor);
    gradient.addColorStop(1, gradientEndColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, canvasHeight);

    // Draw image with border radius
    const x = margin;
    const y = margin;

    // First, draw the shadow by drawing a rounded rectangle with shadow enabled
    ctx.save();
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = shadowOffsetX;
    ctx.shadowOffsetY = shadowOffsetY;

    // Create rounded rectangle path for shadow
    ctx.beginPath();
    ctx.moveTo(x + borderRadius, y);
    ctx.lineTo(x + imageWidth - borderRadius, y);
    ctx.quadraticCurveTo(x + imageWidth, y, x + imageWidth, y + borderRadius);
    ctx.lineTo(x + imageWidth, y + imageHeight - borderRadius);
    ctx.quadraticCurveTo(x + imageWidth, y + imageHeight, x + imageWidth - borderRadius, y + imageHeight);
    ctx.lineTo(x + borderRadius, y + imageHeight);
    ctx.quadraticCurveTo(x, y + imageHeight, x, y + imageHeight - borderRadius);
    ctx.lineTo(x, y + borderRadius);
    ctx.quadraticCurveTo(x, y, x + borderRadius, y);
    ctx.closePath();

    // Fill with white to create the shadow effect
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    // Now draw the image with clipping (no shadow this time)
    ctx.save();

    // Create the same rounded rectangle path for clipping
    ctx.beginPath();
    ctx.moveTo(x + borderRadius, y);
    ctx.lineTo(x + imageWidth - borderRadius, y);
    ctx.quadraticCurveTo(x + imageWidth, y, x + imageWidth, y + borderRadius);
    ctx.lineTo(x + imageWidth, y + imageHeight - borderRadius);
    ctx.quadraticCurveTo(x + imageWidth, y + imageHeight, x + imageWidth - borderRadius, y + imageHeight);
    ctx.lineTo(x + borderRadius, y + imageHeight);
    ctx.quadraticCurveTo(x, y + imageHeight, x, y + imageHeight - borderRadius);
    ctx.lineTo(x, y + borderRadius);
    ctx.quadraticCurveTo(x, y, x + borderRadius, y);
    ctx.closePath();

    // Clip to the rounded rectangle
    ctx.clip();

    // Draw the image
    ctx.drawImage(selectedImage, x, y, imageWidth, imageHeight);

    ctx.restore();
  }, [
    selectedImage,
    imageKey,
    width,
    margin,
    borderRadius,
    shadowBlur,
    shadowOffsetX,
    shadowOffsetY,
    shadowColor,
    gradientStartColor,
    gradientEndColor,
    gradientDirection
  ]);

  // Handle PNG download
  const handleDownloadPNG = () => {
    if (!canvasRef.current) return;

    setShowExportContextMenu(false);
    canvasRef.current.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseFileName || 'screenshot'}-edited.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  // Handle WebP download
  const handleDownloadWebP = () => {
    if (!canvasRef.current) return;

    setShowExportContextMenu(false);
    canvasRef.current.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseFileName || 'screenshot'}-edited.webp`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/webp', 0.95); // 0.95 quality for good balance between size and quality
  };

  return (
    <div class={`w-full ${className}`}>
      {!selectedImage ? (
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
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleFileInputChange}
            class="hidden"
          />

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
              PNG, JPEG, or WebP files
            </p>
          </div>
        </div>
      ) : (
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900">{fileName}</p>
              <p class="text-xs text-gray-500 mt-1">
                Canvas: {width}px × {canvasHeight}px
              </p>
            </div>
            <div class="flex space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedImage(null);
                  setFileName('');
                  setBaseFileName('');
                  setImageKey(0);
                  setCanvasHeight(0);
                }}
              >
                Remove
              </Button>
              <button
                ref={exportButtonRef}
                onClick={() => setShowExportContextMenu(true)}
                class="rounded-md bg-sky-100 hover:bg-sky-200 py-2 px-3 text-sm font-medium text-sky-700 flex items-center cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                  <path d="M12 15V3" />
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="m7 10 5 5 5-5" />
                </svg>
                Export
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-2">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>

          <div class="relative overflow-auto">
            <canvas
              ref={canvasRef}
              class="max-w-full h-auto mx-auto block"
              style={{ maxHeight: '600px' }}
            />
          </div>
        </div>
      )}

      {/* Export Context Menu */}
      <ContextMenu
        isOpen={showExportContextMenu}
        onClose={() => setShowExportContextMenu(false)}
        trigger={exportButtonRef.current}
        width={200}
        position="below"
        items={[
          {
            label: 'Download PNG',
            onClick: handleDownloadPNG,
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10,9 9,9 8,9" />
              </svg>
            )
          },
          {
            label: 'Download WebP',
            onClick: handleDownloadWebP,
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10,9 9,9 8,9" />
              </svg>
            )
          }
        ]}
      />
    </div>
  );
}
