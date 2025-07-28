/**
 * @fileoverview CodeMirror extension for ANSI color support
 * Parses ANSI escape sequences and applies color styling using decorations
 */

import { ViewPlugin, Decoration, EditorView } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { parseAnsiText, stylesToCss, hasAnsiSequences } from '../../utils/ansiParser.js';

/**
 * Create decorations for ANSI colored text
 * @param {string} originalContent - The original text content with ANSI sequences
 * @returns {import('@codemirror/rangeset').RangeSet} Range set of decorations
 */
function createAnsiDecorations(originalContent) {
  const builder = new RangeSetBuilder();
  
  if (!hasAnsiSequences(originalContent)) {
    return builder.finish();
  }
  
  // Parse the original content to get styled segments
  const segments = parseAnsiText(originalContent);
  let displayPosition = 0;
  
  for (const segment of segments) {
    const { text, styles } = segment;
    
    if (text) {
      if (Object.keys(styles).length > 0) {
        // Create decoration for styled text
        const cssStyles = stylesToCss(styles);
        const decoration = Decoration.mark({
          attributes: { style: cssStyles },
          class: 'ansi-styled'
        });
        
        builder.add(displayPosition, displayPosition + text.length, decoration);
      }
      
      displayPosition += text.length;
    }
  }
  
  return builder.finish();
}

/**
 * Create ViewPlugin that adds ANSI color support to CodeMirror
 * @param {string} originalContent - The original content with ANSI sequences
 */
function createAnsiViewPlugin(originalContent) {
  return ViewPlugin.fromClass(
    class {
      constructor(_view) {
        this.decorations = createAnsiDecorations(originalContent);
      }
      
      update(_update) {
        // Decorations are static for this content - no need to update
        // unless we want to support live editing of ANSI content
      }
    },
    {
      decorations: v => v.decorations,
      provide: plugin => plugin
    }
  );
}

/**
 * Extension that provides ANSI color support
 * @param {string} originalContent - The original content with ANSI sequences
 * @returns {import('@codemirror/state').Extension} CodeMirror extension
 */
export function ansiColors(originalContent) {
  return [
    createAnsiViewPlugin(originalContent),
    // Add some basic CSS for ANSI styled text
    EditorView.theme({
      '.ansi-styled': {
        // Base styling for ANSI colored text
        fontFamily: 'inherit',
      }
    })
  ];
}

/**
 * Clean text content by removing ANSI escape sequences
 * This is useful for getting the plain text version
 * @param {string} text - Text with ANSI sequences
 * @returns {string} Clean text without ANSI sequences
 */
export function cleanAnsiText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // Remove ANSI escape sequences
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Get the display length of text (excluding ANSI sequences)
 * @param {string} text - Text with potential ANSI sequences
 * @returns {number} Display length
 */
export function getAnsiDisplayLength(text) {
  return cleanAnsiText(text).length;
}