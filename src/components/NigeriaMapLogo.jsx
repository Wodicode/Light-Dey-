import React from 'react';

// Nigeria outline from WGS84 coordinates, normalized to 100×100 viewBox.
// Bounding box: W 2.69°E · E 14.68°E · S 4.27°N · N 13.89°N
// x = 5 + (lon − 2.69) / 11.99 × 90
// y = 5 + (13.89 − lat) / 9.62 × 90
//
// Clockwise from NW (Sokoto) along N border → NE Lake Chad ear → Cameroon E border
// → Cross River SE arm → Niger Delta S coast → Lagos SW → Benin W border
const NIGERIA_PATH = [
  'M8,5',    // NW: Sokoto (3.1°E, 13.9°N)
  'L22,5',   // N border E (5.0°E, 13.9°N)
  'L37,12',  // N: Katsina dip (7.0°E, 13.1°N)
  'L52,12',  // N: Kano (9.0°E, 13.1°N)
  'L67,11',  // N: W Borno (11.0°E, 13.3°N)
  'L82,7',   // NE: going to Lake Chad ear (13.0°E, 13.7°N)
  'L95,9',   // NE: Lake Chad ear tip — most E point (14.7°E, 13.5°N)
  'L94,18',  // E: back from ear, Cameroon border (14.6°E, 12.5°N)
  'L91,41',  // E: Adamawa (14.2°E, 10.0°N)
  'L86,60',  // E: lower Adamawa (13.5°E, 8.0°N)
  'L85,70',  // SE: Cross River start (13.3°E, 7.0°N)
  'L54,81',  // SE: coast (9.2°E, 5.8°N)
  'L51,93',  // S: Calabar (8.8°E, 4.5°N)
  'L49,95',  // S: southernmost — Akwa Ibom (8.6°E, 4.3°N)
  'L37,95',  // S: Rivers (7.0°E, 4.3°N)
  'L26,93',  // S: Bayelsa / Niger Delta (5.5°E, 4.5°N)
  'L22,86',  // SW: Delta/Edo (5.0°E, 5.2°N)
  'L10,74',  // SW: Lagos area (3.4°E, 6.5°N)
  'L5,65',   // W: lower Benin border (2.7°E, 7.5°N)
  'L5,51',   // W: mid (2.7°E, 9.0°N)
  'L5,32',   // W: upper (2.7°E, 11.0°N)
  'L5,13',   // W: near N (2.7°E, 13.0°N)
  'Z',
].join(' ');

// Lightning bolt centered on Abuja region (~x 47, y 52)
// Top-right → mid-left → notch → bottom → mid-right → notch close
const BOLT_PATH = 'M52,17 L30,53 H45 L41,83 L63,47 H48 Z';

export default function NigeriaMapLogo({ size = 36 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(0,166,81,0.5))' }}
      aria-label="PowerWatch Nigeria — map of Nigeria with lightning bolt"
    >
      <path d={NIGERIA_PATH} fill="#00A651" />
      <path d={BOLT_PATH} fill="white" opacity="0.92" />
    </svg>
  );
}
