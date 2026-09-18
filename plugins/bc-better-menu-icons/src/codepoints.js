/**
 * Maps icon filenames to Unicode codepoints for fantasticon.
 *
 * These codepoints must match the original WordPress dashicons
 * so existing CSS rules like `content: "\f109"` continue to work.
 *
 * Values are decimal representations of the Unicode codepoints.
 */

const dashiconCodepoints = require('./dashicons-codepoints.json');

// Convert the codepoints to the format fantasticon expects.
// Fantasticon expects filenames (without extension) mapped to decimal codepoints.
module.exports = dashiconCodepoints;
