import React from 'react';

/**
 * Static fallback for the hero globe: the shipped satellite earth texture,
 * cropped to a disc so it reads as a globe. Used when WebGL/THREE fails
 * (error boundary) and below the lg breakpoint (no WebGL mount at all).
 */
export function StaticEarth({ size = 320 }) {
  return (
    <div
      className="rounded-full overflow-hidden shadow-2xl ring-1 ring-navy/10"
      style={{ width: size, height: size }}
      role="img"
      aria-label="Satellite view of Earth showing global trade routes"
    >
      <img
        src="/vibrant_satellite_earth.png"
        alt=""
        className="w-full h-full object-cover"
        style={{ objectPosition: '62% 30%' }}
        loading="lazy"
      />
    </div>
  );
}

/**
 * Error boundary around the WebGL globe. A THREE crash unmounts only the
 * globe and swaps in the static earth - never the whole landing page.
 */
export default class GlobeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('Globe failed to render; showing static earth fallback', error, info);
  }

  render() {
    if (this.state.failed) {
      return <StaticEarth size={this.props.fallbackSize || 320} />;
    }
    return this.props.children;
  }
}
