import React from 'react';

// Nigeria outline traced from geographic coordinates (WGS84), normalized to 100×100 viewBox.
// Bounding box: W 2.69°E · E 14.68°E · S 4.27°N · N 13.89°N
// x = 5 + (lon - 2.69) / 11.99 * 90
// y = 5 + (13.89 - lat) / 9.62 * 90
//
// Clockwise from NW (Kebbi): N border → Lake Chad NE ear → Cameroon E border
// → Cross River SE arm → Niger Delta S coast → Lagos SW → Benin W border
const NIGERIA_PATH = [
  'M7,18',    // NW: Kebbi/Sokoto start
  'L21,9',    // upper NW going E
  'L41,6',    // N: Katsina
  'L79,5',    // NE: Borno NW edge
  'L95,13',   // NE Lake Chad ear — most E point (DISTINCTIVE)
  'L90,23',   // E: upper Cameroon border going S
  'L86,41',   // E: mid Adamawa
  'L86,60',   // E: lower Adamawa
  'L75,74',   // SE: Cross River start
  'L67,79',   // SE: Cross River mid
  'L47,89',   // S: Calabar coast
  'L37,93',   // S: Rivers/Niger Delta
  'L30,95',   // S: Bayelsa — southernmost point (DISTINCTIVE)
  'L26,88',   // S: Delta state coast going W
  'L10,75',   // SW: Lagos area
  'L5,65',    // W: Benin border lower
  'L7,46',    // W: Benin border mid
  'L11,27',   // W: Benin/Niger border upper
  'Z',        // closes to M7,18
].join(' ');

// Lightning bolt centered on Abuja area (≈ x:49, y:48 in this coordinate system)
// Scaled from standard 24×24 bolt at ×1.7, offset (27, 28)
const BOLT_PATH = 'M49,31 L35,51 H46 L44,65 L60,46 H49 Z';

export default function NigeriaMapLogo({ size = 36 }) {
  const rx = Math.round((size / 100) * 22);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(0,166,81,0.5))' }}
      aria-label="PowerWatch Nigeria — map of Nigeria with lightning bolt"
    >
      <rect width="100" height="100" rx={rx} fill="#071a0e" />
      <path d={NIGERIA_PATH} fill="#00A651" />
      <path d={BOLT_PATH} fill="white" opacity="0.92" />
    </svg>
  );
}
