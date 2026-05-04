import React from 'react';

// Nigeria silhouette path — normalized to 0 0 100 100 viewBox
// Key points (clockwise from NW): Sokoto → N border → Lake Chad → Cameroon border
// → SE tail → Niger Delta coast → SW coast → W border (Benin) → back NW
const NIGERIA_PATH =
  'M12,12 L42,5 L72,7 L88,14 L92,32 L90,48 L85,60 L78,72 L72,82 L56,90 L44,92 L32,88 L20,80 L10,72 L8,55 L10,35 L12,20 Z';

// Lightning bolt centered within the Nigeria shape (~x:50, y:50)
const BOLT_PATH = 'M53,26 L32,54 H48 L45,76 L68,47 H53 Z';

export default function NigeriaMapLogo({ size = 36 }) {
  // Round-rect rx scales proportionally
  const rx = Math.round((size / 100) * 22);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(0,166,81,0.5))' }}
      aria-label="PowerWatch Nigeria logo — map of Nigeria with lightning bolt"
    >
      {/* Dark background badge */}
      <rect width="100" height="100" rx={rx} fill="#071a0e" />

      {/* Nigeria silhouette */}
      <path d={NIGERIA_PATH} fill="#00A651" />

      {/* Lightning bolt overlay */}
      <path d={BOLT_PATH} fill="white" opacity="0.92" />
    </svg>
  );
}
