import { micromark } from 'micromark';

export function MarkdownPreview({ markdown = '' }) {
  const htmlContent = micromark(markdown);

  return (
    <div
      class="prose prose-sm max-w-none h-full overflow-y-auto p-4 bg-gray-50 border border-gray-200 rounded-md"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}