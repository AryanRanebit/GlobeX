import React from 'react';

/**
 * GlobeX logomark: a globe (circle + meridian) with a saffron trade-route
 * arc sweeping out of it toward an endpoint node. Deep teal on light
 * surfaces; cream + brighter amber on the dark sidebar.
 */
export function LogoMark({ size = 32, onDark = false, className = '' }) {
  const globe = onDark ? '#F5F2EA' : '#0F766E';
  const route = onDark ? '#F59E0B' : '#B45309';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <circle cx="15" cy="16.5" r="9.5" stroke={globe} strokeWidth="2.2" />
      <ellipse cx="15" cy="16.5" rx="4.4" ry="9.5" stroke={globe} strokeWidth="1.3" opacity="0.7" />
      <path
        d="M6 21 C 12.5 12, 20.5 8.5, 27.5 9.5"
        stroke={route}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="27.5" cy="9.5" r="2.4" fill={route} />
      <circle cx="6" cy="21" r="1.7" fill={globe} />
    </svg>
  );
}

/** Wordmark: "Globe" in ink/cream with the X in the saffron accent. */
export function LogoWordmark({ onDark = false, className = '' }) {
  return (
    <span
      className={`font-heading font-bold tracking-tight whitespace-nowrap ${
        onDark ? 'text-cream' : 'text-navy'
      } ${className}`}
    >
      Globe<span className={onDark ? 'text-[#F59E0B]' : 'text-accent'}>X</span>
    </span>
  );
}

export default LogoMark;
