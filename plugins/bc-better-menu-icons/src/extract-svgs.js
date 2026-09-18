/**
 * Extract SVGs for font generation.
 *
 * For each dashicon:
 * - If mapped to @wordpress/icons: extract that SVG
 * - If not mapped (null): copy the original dashicon SVG
 *
 * Output goes to build/svg-icons/ for fantasticon to process.
 */

const fs = require('fs');
const path = require('path');

// Import dependencies
const icons = require('@wordpress/icons');
const iconMapping = require('./icon-mapping');
const codepoints = require('./codepoints');

// Paths
const OUTPUT_DIR = path.join(__dirname, '..', 'build', 'svg-icons');
const ORIGINAL_DASHICONS_DIR = path.join(__dirname, 'original-dashicons');
const CUSTOM_ICONS_DIR = path.join(__dirname, 'custom-icons');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
} else {
  // Clean existing files
  fs.readdirSync(OUTPUT_DIR).forEach(file => {
    fs.unlinkSync(path.join(OUTPUT_DIR, file));
  });
}

/**
 * Recursively render React element to SVG string.
 */
function renderElement(element) {
  if (!element) {
    return '';
  }

  // Handle string content
  if (typeof element === 'string') {
    return element;
  }

  // Handle array of elements
  if (Array.isArray(element)) {
    return element.map(renderElement).join('');
  }

  // Handle React element object
  if (element.props) {
    const props = { ...element.props };
    const children = props.children;
    delete props.children;

    // Determine the tag name from the element type
    let tagName = element.type || 'path';

    // If type is a string, use it directly
    if (typeof tagName !== 'string') {
      // Infer tag name from props
      if (props.d !== undefined) {
        tagName = 'path';
      } else if (props.cx !== undefined || props.cy !== undefined) {
        tagName = 'circle';
      } else if (props.x1 !== undefined || props.y1 !== undefined) {
        tagName = 'line';
      } else if (props.points !== undefined) {
        tagName = 'polygon';
      } else if (props.x !== undefined && props.width !== undefined) {
        tagName = 'rect';
      } else {
        tagName = 'g';
      }
    }

    // Build attribute string
    const attrs = Object.entries(props)
      .filter(([key, value]) => value !== undefined && key !== 'xmlns' && key !== 'viewBox')
      .map(([key, value]) => {
        // Convert camelCase to kebab-case for SVG attributes
        const attrName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${attrName}="${value}"`;
      })
      .join(' ');

    const innerContent = renderElement(children);

    if (innerContent) {
      return `<${tagName}${attrs ? ' ' + attrs : ''}>${innerContent}</${tagName}>`;
    } else {
      return `<${tagName}${attrs ? ' ' + attrs : ''} />`;
    }
  }

  return '';
}

/**
 * Extract SVG string from a @wordpress/icons icon object.
 */
function extractSvgFromWpIcon(iconObject) {
  if (!iconObject || !iconObject.props) {
    return null;
  }

  const { props } = iconObject;
  const viewBox = props.viewBox || '0 0 24 24';

  // Build the inner SVG content from children
  let innerContent = renderElement(props.children);

  // Create SVG - use currentColor so it inherits the text color
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="currentColor">${innerContent}</svg>`;

  return svg;
}

/**
 * Convert icon name from kebab-case to camelCase for @wordpress/icons lookup.
 */
function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

// Stats
let extracted = 0;
let copiedOriginal = 0;
let missing = 0;

console.log('Extracting SVGs for font generation...\n');

// Process each dashicon from codepoints
for (const [dashiconName, codepoint] of Object.entries(codepoints)) {
  const wpIconName = iconMapping[dashiconName];

  if (wpIconName) {
    // Mapped to @wordpress/icons - extract that SVG
    const camelCaseName = toCamelCase(wpIconName);
    const wpIcon = icons[camelCaseName];

    if (wpIcon) {
      const svg = extractSvgFromWpIcon(wpIcon);
      if (svg) {
        fs.writeFileSync(path.join(OUTPUT_DIR, `${dashiconName}.svg`), svg);
        console.log(`✓ ${dashiconName} -> @wordpress/icons/${wpIconName}`);
        extracted++;
      } else {
        console.warn(`✗ ${dashiconName} - Could not extract SVG from ${wpIconName}`);
        missing++;
      }
    } else {
      console.warn(`✗ ${dashiconName} - @wordpress/icons/${wpIconName} (${camelCaseName}) not found`);
      missing++;
    }
  } else if (wpIconName === null) {
    // Explicitly not mapped - check for custom icon first, then use original dashicon
    const customPath = path.join(CUSTOM_ICONS_DIR, `${dashiconName}.svg`);
    const originalPath = path.join(ORIGINAL_DASHICONS_DIR, `${dashiconName}.svg`);
    const outputPath = path.join(OUTPUT_DIR, `${dashiconName}.svg`);

    if (fs.existsSync(customPath)) {
      // Use custom icon
      let svg = fs.readFileSync(customPath, 'utf8');

      if (!svg.includes('fill="currentColor"')) {
        svg = svg.replace(/<svg([^>]*)>/, '<svg$1 fill="currentColor">');
      }

      fs.writeFileSync(outputPath, svg);
      console.log(`★ ${dashiconName} -> custom icon`);
      copiedOriginal++;
    } else if (fs.existsSync(originalPath)) {
      // Read and potentially modify the original SVG
      let svg = fs.readFileSync(originalPath, 'utf8');

      // Ensure it has fill="currentColor" for theme compatibility
      if (!svg.includes('fill="currentColor"')) {
        // Add fill to the root SVG element
        svg = svg.replace(/<svg([^>]*)>/, '<svg$1 fill="currentColor">');
      }

      fs.writeFileSync(outputPath, svg);
      console.log(`○ ${dashiconName} -> original dashicon`);
      copiedOriginal++;
    } else {
      console.warn(`✗ ${dashiconName} - Original dashicon SVG not found`);
      missing++;
    }
  } else {
    // Not in mapping at all - use original dashicon
    const originalPath = path.join(ORIGINAL_DASHICONS_DIR, `${dashiconName}.svg`);
    const outputPath = path.join(OUTPUT_DIR, `${dashiconName}.svg`);

    if (fs.existsSync(originalPath)) {
      let svg = fs.readFileSync(originalPath, 'utf8');

      if (!svg.includes('fill="currentColor"')) {
        svg = svg.replace(/<svg([^>]*)>/, '<svg$1 fill="currentColor">');
      }

      fs.writeFileSync(outputPath, svg);
      console.log(`○ ${dashiconName} -> original dashicon (unmapped)`);
      copiedOriginal++;
    } else {
      console.warn(`✗ ${dashiconName} - No mapping and original not found`);
      missing++;
    }
  }
}

console.log('\n--- Summary ---');
console.log(`Extracted from @wordpress/icons: ${extracted}`);
console.log(`Copied from original dashicons: ${copiedOriginal}`);
console.log(`Missing: ${missing}`);
console.log(`Total: ${extracted + copiedOriginal}`);
console.log(`\nOutput directory: ${OUTPUT_DIR}`);
