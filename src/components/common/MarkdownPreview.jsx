import { micromark } from 'micromark';
import { gfm, gfmHtml } from 'micromark-extension-gfm';
import DOMPurify from 'dompurify';
import { useMemo } from 'preact/hooks';

// DOMPurify configuration - define once for performance
const DOMPURIFY_CONFIG = {
  // Allow common inline and block elements
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins',
    'code', 'pre', 'blockquote', 'a', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'hr', 'img', 'div', 'span'
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'class', 'id',
    'src', 'alt', 'title', 'width', 'height'
  ],
  // Keep text content even if tag is removed
  KEEP_CONTENT: true,
  // Return clean HTML string
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false
};

export function MarkdownPreview({ markdown = '', className = '' }) {
  // Memoize the HTML conversion and sanitization for performance
  const cleanHtml = useMemo(() => {
    // Step 1: Convert markdown to HTML with HTML support enabled
    let htmlContent = micromark(markdown, {
      allowDangerousHtml: true,
      extensions: [gfm()],
      htmlExtensions: [gfmHtml()]
    });

    // Step 2: Add target="_blank" and rel="noopener noreferrer" to all links
    // This maintains the existing security feature for external links
    htmlContent = htmlContent.replace(
      /<a href=/g,
      '<a target="_blank" rel="noopener noreferrer" href='
    );

    // Step 3: Sanitize HTML to prevent XSS attacks
    // DOMPurify removes script tags, event handlers, and other dangerous content
    return DOMPurify.sanitize(htmlContent, DOMPURIFY_CONFIG);
  }, [markdown]);

  return (
    <div
      class={`prose prose-sm max-w-none h-full overflow-y-auto break-words mb-2
        prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700
        prose-strong:text-gray-900 prose-code:text-gray-800 prose-blockquote:text-gray-600
        prose-a:text-sky-700 prose-th:text-gray-900 prose-td:text-gray-700
        dark:prose-headings:text-neutral-dark-900 dark:prose-p:text-neutral-dark-700
        dark:prose-li:text-neutral-dark-700 dark:prose-strong:text-neutral-dark-900
        dark:prose-code:text-neutral-dark-700 dark:prose-blockquote:text-neutral-dark-600
        dark:prose-a:text-sky-400 dark:prose-th:text-neutral-dark-900
        dark:prose-td:text-neutral-dark-700 dark:prose-hr:border-neutral-dark-300 ${className}`}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}
