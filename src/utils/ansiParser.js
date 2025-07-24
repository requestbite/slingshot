/**
 * @fileoverview ANSI escape sequence parser for converting color codes to CSS styles
 * Supports basic 3/4-bit colors, 8-bit (256) colors, and 24-bit RGB colors
 */

// Standard 3/4-bit color mappings
const ANSI_COLORS = {
  // Standard colors (30-37, 40-47)
  30: '#000000', // black
  31: '#CD3131', // red
  32: '#0DBC79', // green
  33: '#E5E510', // yellow
  34: '#2472C8', // blue
  35: '#BC3FBC', // magenta
  36: '#11A8CD', // cyan
  37: '#E5E5E5', // white
  
  // Bright colors (90-97, 100-107)
  90: '#666666', // bright black (gray)
  91: '#F14C4C', // bright red
  92: '#23D18B', // bright green
  93: '#F5F543', // bright yellow
  94: '#3B8EEA', // bright blue
  95: '#D670D6', // bright magenta
  96: '#29B8DB', // bright cyan
  97: '#E5E5E5', // bright white
};

// 256-color palette (simplified - using approximations)
const ANSI_256_COLORS = (() => {
  const colors = [];
  
  // Standard 16 colors (0-15)
  colors.push('#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#c0c0c0');
  colors.push('#808080', '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff', '#ffffff');
  
  // 216 color cube (16-231)
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        const rv = r === 0 ? 0 : 55 + r * 40;
        const gv = g === 0 ? 0 : 55 + g * 40;
        const bv = b === 0 ? 0 : 55 + b * 40;
        colors.push(`#${rv.toString(16).padStart(2, '0')}${gv.toString(16).padStart(2, '0')}${bv.toString(16).padStart(2, '0')}`);
      }
    }
  }
  
  // Grayscale (232-255)
  for (let i = 0; i < 24; i++) {
    const v = 8 + i * 10;
    const hex = v.toString(16).padStart(2, '0');
    colors.push(`#${hex}${hex}${hex}`);
  }
  
  return colors;
})();

/**
 * Parse ANSI escape sequences and convert them to styled spans
 * @param {string} text - Text containing ANSI escape sequences
 * @returns {Array} Array of {text, styles} objects
 */
export function parseAnsiText(text) {
  if (!text || typeof text !== 'string') {
    return [{ text: '', styles: {} }];
  }

  const result = [];
  let currentStyles = {};
  let currentPos = 0;
  
  // ANSI escape sequence regex
  // Matches: \033[<params>m or \u001b[<params>m
  const ansiRegex = /\x1b\[([0-9;]*)m/g;
  let match;
  
  while ((match = ansiRegex.exec(text)) !== null) {
    // Add text before the escape sequence
    if (match.index > currentPos) {
      const textSegment = text.slice(currentPos, match.index);
      if (textSegment) {
        result.push({ text: textSegment, styles: { ...currentStyles } });
      }
    }
    
    // Process the escape sequence
    const params = match[1] ? match[1].split(';').map(p => parseInt(p, 10) || 0) : [0];
    currentStyles = processAnsiParams(params, currentStyles);
    
    currentPos = match.index + match[0].length;
  }
  
  // Add remaining text
  if (currentPos < text.length) {
    const remainingText = text.slice(currentPos);
    if (remainingText) {
      result.push({ text: remainingText, styles: { ...currentStyles } });
    }
  }
  
  // If no ANSI sequences found, return the original text
  if (result.length === 0) {
    result.push({ text, styles: {} });
  }
  
  return result;
}

/**
 * Process ANSI parameters and update current styles
 * @param {number[]} params - Array of ANSI parameters
 * @param {Object} currentStyles - Current style object
 * @returns {Object} Updated style object
 */
function processAnsiParams(params, currentStyles) {
  const newStyles = { ...currentStyles };
  
  for (let i = 0; i < params.length; i++) {
    const param = params[i];
    
    switch (param) {
      case 0:
        // Reset all
        return {};
        
      case 1:
        // Bold
        newStyles.fontWeight = 'bold';
        break;
        
      case 22:
        // Normal intensity (turn off bold)
        delete newStyles.fontWeight;
        break;
        
      case 30: case 31: case 32: case 33: case 34: case 35: case 36: case 37:
        // Standard foreground colors
        newStyles.color = ANSI_COLORS[param];
        break;
        
      case 39:
        // Default foreground color
        delete newStyles.color;
        break;
        
      case 40: case 41: case 42: case 43: case 44: case 45: case 46: case 47:
        // Standard background colors
        newStyles.backgroundColor = ANSI_COLORS[param - 10];
        break;
        
      case 49:
        // Default background color
        delete newStyles.backgroundColor;
        break;
        
      case 90: case 91: case 92: case 93: case 94: case 95: case 96: case 97:
        // Bright foreground colors
        newStyles.color = ANSI_COLORS[param];
        break;
        
      case 100: case 101: case 102: case 103: case 104: case 105: case 106: case 107:
        // Bright background colors
        newStyles.backgroundColor = ANSI_COLORS[param - 10];
        break;
        
      case 38:
        // Extended foreground color
        if (i + 1 < params.length) {
          const nextParam = params[i + 1];
          if (nextParam === 5 && i + 2 < params.length) {
            // 256-color mode: \033[38;5;<color>m
            const colorIndex = params[i + 2];
            if (colorIndex >= 0 && colorIndex < ANSI_256_COLORS.length) {
              newStyles.color = ANSI_256_COLORS[colorIndex];
            }
            i += 2; // Skip the next two parameters
          } else if (nextParam === 2 && i + 4 < params.length) {
            // RGB mode: \033[38;2;<r>;<g>;<b>m
            const r = Math.max(0, Math.min(255, params[i + 2]));
            const g = Math.max(0, Math.min(255, params[i + 3]));
            const b = Math.max(0, Math.min(255, params[i + 4]));
            newStyles.color = `rgb(${r}, ${g}, ${b})`;
            i += 4; // Skip the next four parameters
          }
        }
        break;
        
      case 48:
        // Extended background color
        if (i + 1 < params.length) {
          const nextParam = params[i + 1];
          if (nextParam === 5 && i + 2 < params.length) {
            // 256-color mode: \033[48;5;<color>m
            const colorIndex = params[i + 2];
            if (colorIndex >= 0 && colorIndex < ANSI_256_COLORS.length) {
              newStyles.backgroundColor = ANSI_256_COLORS[colorIndex];
            }
            i += 2; // Skip the next two parameters
          } else if (nextParam === 2 && i + 4 < params.length) {
            // RGB mode: \033[48;2;<r>;<g>;<b>m
            const r = Math.max(0, Math.min(255, params[i + 2]));
            const g = Math.max(0, Math.min(255, params[i + 3]));
            const b = Math.max(0, Math.min(255, params[i + 4]));
            newStyles.backgroundColor = `rgb(${r}, ${g}, ${b})`;
            i += 4; // Skip the next four parameters
          }
        }
        break;
        
      // Ignore other parameters for now
      default:
        break;
    }
  }
  
  return newStyles;
}

/**
 * Convert styles object to CSS string
 * @param {Object} styles - Style object
 * @returns {string} CSS style string
 */
export function stylesToCss(styles) {
  return Object.entries(styles)
    .map(([key, value]) => {
      // Convert camelCase to kebab-case
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssKey}: ${value}`;
    })
    .join('; ');
}

/**
 * Check if text contains ANSI escape sequences
 * @param {string} text - Text to check
 * @returns {boolean} True if text contains ANSI sequences
 */
export function hasAnsiSequences(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  return /\x1b\[[0-9;]*m/.test(text);
}