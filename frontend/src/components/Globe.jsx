import React, { useEffect, useRef, forwardRef, useMemo } from 'react';
import GlobeGL from 'react-globe.gl';

/* ── India & Top Global Export Trade Corridors ────────────────────────── */
const ORIGIN = { lat: 19.0760, lng: 72.8777, label: 'India (Mumbai Port)' };

const DESTINATIONS = [
  { lat: 40.7128, lng: -74.0060, label: 'United States', city: 'New York', color: ['#2563EB', '#60A5FA'] },
  { lat: 25.2048, lng: 55.2708,  label: 'UAE', city: 'Dubai', color: ['#2563EB', '#10B981'] },
  { lat: 51.9244, lng: 4.4777,   label: 'Netherlands', city: 'Rotterdam', color: ['#2563EB', '#38BDF8'] },
  { lat: 50.1109, lng: 8.6821,   label: 'Germany', city: 'Frankfurt', color: ['#2563EB', '#F59E0B'] },
  { lat: 51.5074, lng: -0.1278,  label: 'United Kingdom', city: 'London', color: ['#2563EB', '#818CF8'] },
  { lat: 1.3521,  lng: 103.8198, label: 'Singapore', city: 'Singapore', color: ['#2563EB', '#34D399'] },
  { lat: 24.7136, lng: 46.6753,  label: 'Saudi Arabia', city: 'Riyadh', color: ['#2563EB', '#FBBF24'] },
  { lat: 35.6762, lng: 139.6503, label: 'Japan', city: 'Tokyo', color: ['#2563EB', '#A78BFA'] },
  { lat: -33.8688, lng: 151.2093, label: 'Australia', city: 'Sydney', color: ['#2563EB', '#F472B6'] }
];

/* ── Trade Arcs from India to Top Global Markets ─────────────────────── */
const TRADE_ARCS = DESTINATIONS.map((dest, index) => ({
  startLat: ORIGIN.lat,
  startLng: ORIGIN.lng,
  endLat: dest.lat,
  endLng: dest.lng,
  color: dest.color,
  name: `${ORIGIN.label} → ${dest.label}`,
  order: index
}));

/* ── Hub Points ──────────────────────────────────────────────────────── */
const HUB_POINTS = [
  {
    lat: ORIGIN.lat,
    lng: ORIGIN.lng,
    label: ORIGIN.label,
    color: '#10B981',
    size: 0.6,
    isOrigin: true
  },
  ...DESTINATIONS.map(d => ({
    lat: d.lat,
    lng: d.lng,
    label: `${d.city}, ${d.label}`,
    color: '#2563EB',
    size: 0.38,
    isOrigin: false
  }))
];

/* ── Ripple Rings for Live Corridor Activity ─────────────────────────── */
const RINGS = [
  { lat: ORIGIN.lat, lng: ORIGIN.lng, color: (t) => `rgba(16, 185, 129, ${1 - t})` },
  { lat: 40.7128, lng: -74.0060, color: (t) => `rgba(37, 99, 235, ${0.8 * (1 - t)})` },
  { lat: 25.2048, lng: 55.2708, color: (t) => `rgba(16, 185, 129, ${0.8 * (1 - t)})` },
  { lat: 51.9244, lng: 4.4777, color: (t) => `rgba(56, 189, 248, ${0.8 * (1 - t)})` }
];

/* ── Labels ──────────────────────────────────────────────────────────── */
const LABELS = [
  {
    lat: ORIGIN.lat,
    lng: ORIGIN.lng,
    text: 'India (Hub)',
    color: '#059669',
    size: 1.1,
    dot: 0.5
  },
  ...DESTINATIONS.map(d => ({
    lat: d.lat,
    lng: d.lng,
    text: d.city,
    color: '#334155',
    size: 0.85,
    dot: 0.35
  }))
];

/* ── Globe Component ─────────────────────────────────────────────────── */
const Globe = forwardRef(({ width, height }, ref) => {
  const globeEl = useRef();

  useEffect(() => {
    if (!globeEl.current) return;
    const controls = globeEl.current.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableRotate = true;
    }

    // Set initial point of view centered on India
    globeEl.current.pointOfView({ lat: 21, lng: 78, altitude: 2.15 }, 800);

    // Performance optimization: Pause or limit animation when tab is inactive
    const handleVisibilityChange = () => {
      if (!globeEl.current) return;
      const ctrl = globeEl.current.controls();
      if (!ctrl) return;
      
      if (document.hidden) {
        ctrl.autoRotate = false;
        if (typeof globeEl.current.pauseAnimation === 'function') {
          globeEl.current.pauseAnimation();
        }
      } else {
        ctrl.autoRotate = true;
        if (typeof globeEl.current.resumeAnimation === 'function') {
          globeEl.current.resumeAnimation();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center select-none">
      <GlobeGL
        ref={globeEl}
        width={width}
        height={height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        atmosphereColor="rgba(37, 99, 235, 0.28)"
        atmosphereAltitude={0.16}
        backgroundColor="rgba(0,0,0,0)"

        /* Animated Arcs */
        arcsData={TRADE_ARCS}
        arcColor="color"
        arcDashLength={0.42}
        arcDashGap={0.28}
        arcDashInitialGap={(d) => (d.order * 0.3) % 2}
        arcDashAnimateTime={2200}
        arcStroke={0.55}
        arcAltitude={0.24}
        arcsTransitionDuration={700}

        /* Hub Points */
        pointsData={HUB_POINTS}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointRadius="size"
        pointAltitude={0.015}
        pointsMerge={false}
        pointsTransitionDuration={400}

        /* Pulsing Activity Rings */
        ringsData={RINGS}
        ringLat="lat"
        ringLng="lng"
        ringColor="color"
        ringMaxRadius={2.5}
        ringPropagationSpeed={1.4}
        ringRepeatPeriod={1600}

        /* City Labels */
        labelsData={LABELS}
        labelLat="lat"
        labelLng="lng"
        labelText="text"
        labelSize="size"
        labelDotRadius="dot"
        labelColor={(d) => d.color}
        labelResolution={2}
        labelAltitude={0.02}
      />
    </div>
  );
});

Globe.displayName = 'Globe';
export default Globe;
