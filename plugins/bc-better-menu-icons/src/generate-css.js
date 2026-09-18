#!/usr/bin/env node
/**
 * Generate dashicons CSS file from codepoints.
 */

const fs = require('fs');
const path = require('path');

const CODEPOINTS_FILE = path.join(__dirname, 'dashicons-codepoints.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'assets', 'fonts', 'dashicons.css');

// Load codepoints
const codepoints = JSON.parse(fs.readFileSync(CODEPOINTS_FILE, 'utf8'));

// Build CSS content
let css = `@font-face {
    font-family: "dashicons";
    src: url("./dashicons.woff2") format("woff2"),
         url("./dashicons.woff") format("woff"),
         url("./dashicons.ttf") format("truetype");
    font-weight: normal;
    font-style: normal;
}

.dashicons,
.dashicons-before:before {
    font-family: dashicons;
    display: inline-block;
    width: 20px;
    height: 20px;
    font-size: 20px;
    line-height: 1;
    font-weight: 400;
    font-style: normal;
    speak: never;
    text-decoration: inherit;
    text-transform: none;
    text-rendering: auto;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    vertical-align: top;
    text-align: center;
    transition: color .1s ease-in;
}

`;

// Generate icon classes
for (const [name, codepoint] of Object.entries(codepoints)) {
    const hex = codepoint.toString(16);
    css += `.dashicons-${name}:before {
    content: "\\${hex}";
}
`;
}

// Write CSS file
fs.writeFileSync(OUTPUT_FILE, css);
console.log(`Generated CSS with ${Object.keys(codepoints).length} icons: ${OUTPUT_FILE}`);
