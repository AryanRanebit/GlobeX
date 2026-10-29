import React from 'react';

/**
 * Static fallback for the hero globe: a capture of the real 3D globe
 * (teal arcs, on the hero's cream background so it blends seamlessly).
 * Used when WebGL/THREE fails (error boundary) and below the lg
 * breakpoint (no WebGL mount at all).
 */
export function StaticEarth({ size = 320 }) {
  return (
    <img
      src="/globe-static.png"
      alt="Globe showing live export corridors from India"
      className="pointer-events-none select-none"
      style={{ width: size, height: size }}
      loading="lazy"
    />
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
