import React from 'react';

export default function NigeriaMapLogo({ size = 36 }) {
  return (
    <img
      src="/icon-192.png"
      width={size}
      height={size}
      alt="PowerWatch Nigeria"
      style={{ flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(0,166,81,0.5))' }}
    />
  );
}
