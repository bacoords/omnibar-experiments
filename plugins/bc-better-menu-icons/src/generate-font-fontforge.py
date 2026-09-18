#!/usr/bin/env python3
"""
Generate dashicons font using FontForge.

FontForge properly handles SVG fill-rule="evenodd" when converting to fonts,
unlike svgicons2svgfont which only supports non-zero fill rule.
"""

import fontforge
import json
import os
import sys

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR = os.path.join(SCRIPT_DIR, '..', 'build', 'svg-icons')
OUTPUT_DIR = os.path.join(SCRIPT_DIR, '..', 'assets', 'fonts')
CODEPOINTS_FILE = os.path.join(SCRIPT_DIR, 'dashicons-codepoints.json')

# Font settings
FONT_NAME = 'dashicons'
FONT_FAMILY = 'dashicons'
EM_SIZE = 1024
ASCENT = 850
DESCENT = 174

def main():
    print("Generating font with FontForge...")

    # Load codepoints
    with open(CODEPOINTS_FILE, 'r') as f:
        codepoints = json.load(f)

    # Create new font
    font = fontforge.font()
    font.fontname = FONT_NAME
    font.familyname = FONT_FAMILY
    font.fullname = FONT_FAMILY
    font.em = EM_SIZE
    font.ascent = ASCENT
    font.descent = DESCENT

    # Process each SVG
    count = 0
    for icon_name, codepoint in codepoints.items():
        svg_path = os.path.join(BUILD_DIR, f'{icon_name}.svg')

        if not os.path.exists(svg_path):
            print(f"  Skip: {icon_name} (no SVG)")
            continue

        # Create glyph at the codepoint
        # Use prefixed name to avoid conflicts with standard glyph names (e.g., "plus" -> U+002B)
        glyph_name = f'dash_{icon_name}'
        glyph = font.createChar(codepoint, glyph_name)

        # Import SVG
        try:
            glyph.importOutlines(svg_path)
            glyph.width = EM_SIZE

            # Explicitly set the unicode codepoint to ensure it's correct
            glyph.unicode = codepoint

            # Correct direction for proper fill
            glyph.correctDirection()

            count += 1
            print(f"  ✓ {icon_name} (U+{codepoint:04X})")
        except Exception as e:
            print(f"  ✗ {icon_name}: {e}")

    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Generate fonts
    font.generate(os.path.join(OUTPUT_DIR, 'dashicons.ttf'))
    font.generate(os.path.join(OUTPUT_DIR, 'dashicons.woff'))
    font.generate(os.path.join(OUTPUT_DIR, 'dashicons.woff2'))

    print(f"\nGenerated {count} glyphs")
    print(f"Output: {OUTPUT_DIR}")

if __name__ == '__main__':
    main()
