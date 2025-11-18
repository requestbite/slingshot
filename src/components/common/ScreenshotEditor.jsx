import { useState, useRef, useEffect } from 'preact/hooks';
import { Button } from './Button';

/**
 * ScreenshotEditor Component
 *
 * A browser-based screenshot editor that allows users to upload an image
 * and render it on a canvas with customizable gradient background, margins,
 * border radius, and drop shadow effects.
 *
 * @param {Object} props
 * @param {number} [props.width=1500] - Canvas width in pixels
 * @param {number} [props.margin=60] - Padding around the image in pixels
 * @param {number} [props.borderRadius=8] - Border radius of the image in pixels
 * @param {number} [props.shadowBlur=40] - Shadow blur radius in pixels
 * @param {number} [props.shadowOffsetX=0] - Shadow horizontal offset in pixels
 * @param {number} [props.shadowOffsetY=10] - Shadow vertical offset in pixels
 * @param {string} [props.shadowColor='rgba(0,0,0,0.3)'] - Shadow color
 * @param {string} [props.gradientStartColor='#667eea'] - Gradient start color
 * @param {string} [props.gradientEndColor='#764ba2'] - Gradient end color
 * @param {string} [props.gradientDirection='horizontal'] - 'horizontal' or 'vertical'
 * @param {string} [props.className] - Additional CSS classes
 */
export function ScreenshotEditor({
  width = 1500,
  margin = 60,
  borderRadius = 8,
  shadowBlur = 40,
  shadowOffsetX = 0,
  shadowOffsetY = 10,
  shadowColor = 'rgba(0,0,0,0.3)',
  gradientStartColor = '#667eea',
  gradientEndColor = '#764ba2',
  gradientDirection = 'horizontal',
  className = ''
}) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      alert('Please select a PNG or JPEG image file.');
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setSelectedImage(img);
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

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Calculate canvas dimensions
    const imageWidth = width - (margin * 2);
    const imageHeight = (selectedImage.height / selectedImage.width) * imageWidth;
    const canvasHeight = imageHeight + (margin * 2);

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = canvasHeight;

    // Clear canvas
    ctx.clearRect(0, 0, width, canvasHeight);

    // Draw gradient background
    const gradient = gradientDirection === 'horizontal'
      ? ctx.createLinearGradient(0, 0, width, 0)
      : ctx.createLinearGradient(0, 0, 0, canvasHeight);

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

  // Handle download
  const handleDownload = () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `screenshot-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  return (
    <div class={`w-full ${className}`}>
      {!selectedImage ? (
        <div
          class={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
            isDragging
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
            accept="image/png,image/jpeg,image/jpg"
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
              PNG or JPEG files only
            </p>
          </div>
        </div>
      ) : (
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900">{fileName}</p>
              <p class="text-xs text-gray-500 mt-1">
                Canvas: {width}px × {canvasRef.current?.height || 0}px
              </p>
            </div>
            <div class="flex space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedImage(null);
                  setFileName('');
                }}
              >
                Remove
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownload}
              >
                Download PNG
              </Button>
            </div>
          </div>

          <div class="relative bg-gray-100 rounded-lg p-4 overflow-auto">
            <canvas
              ref={canvasRef}
              class="max-w-full h-auto mx-auto block"
              style={{ maxHeight: '600px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
