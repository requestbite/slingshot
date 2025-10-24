import { micromark } from 'micromark';

export function MarkdownPreview({ markdown = '' }) {
  let htmlContent = micromark(markdown);

  // Add target="_blank" and rel="noopener noreferrer" to all links
  htmlContent = htmlContent.replace(
    /<a href=/g,
    '<a target="_blank" rel="noopener noreferrer" href='
  );

  return (
    <div
      class="prose prose-sm max-w-none h-full overflow-y-auto prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 mb-2"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
