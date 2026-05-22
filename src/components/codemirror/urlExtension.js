import { ViewPlugin, Decoration, EditorView } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

const URL_REGEX = /https?:\/\/[^\s"'<>)\]]+/g;

const urlMark = Decoration.mark({
  attributes: { style: 'text-decoration: underline; cursor: pointer;' }
});

function buildDecorations(view) {
  const builder = new RangeSetBuilder();
  const text = view.state.doc.toString();
  const matches = [];
  let match;
  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    matches.push({ from: match.index, to: match.index + match[0].length });
  }
  for (const { from, to } of matches) {
    builder.add(from, to, urlMark);
  }
  return builder.finish();
}

const urlPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = buildDecorations(view);
    }
    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: v => v.decorations }
);

const urlClickHandler = EditorView.domEventHandlers({
  click(event, view) {
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos === null) return false;
    const text = view.state.doc.toString();
    URL_REGEX.lastIndex = 0;
    let match;
    while ((match = URL_REGEX.exec(text)) !== null) {
      if (pos >= match.index && pos <= match.index + match[0].length) {
        const url = match[0].replace(/[.,;:!?]+$/, '');
        window.open(url, '_blank', 'noopener,noreferrer');
        return true;
      }
    }
    return false;
  }
});

export const urlLinks = [urlPlugin, urlClickHandler];
