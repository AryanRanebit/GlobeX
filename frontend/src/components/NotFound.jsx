import React from 'react';
import { Compass, ArrowLeft } from 'lucide-react';
import LogoMark from './ui/Logo';

// Shown for any URL path the app does not serve. The Vercel SPA rewrite
// sends every path to index.html, so without this check a mistyped link
// used to render the normal app as if the address were valid.
export default function NotFound() {
  const path = window.location.pathname;
  return (
    <div className="min-h-screen bg-page flex flex-col">
      <header className="border-b border-line bg-white">
        <div className="section-container py-4">
          <a href="/" aria-label="GlobeX home" className="inline-flex items-center gap-2">
            <LogoMark size={26} />
            <span className="text-lg font-bold text-navy font-heading">GlobeX</span>
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-xl bg-blue-pale border border-blue-border text-blue flex items-center justify-center mx-auto mb-5">
            <Compass size={26} />
          </div>
          <p className="text-xs font-bold text-blue uppercase tracking-wider mb-2">404 · Page not found</p>
          <h1 className="text-2xl font-bold text-navy font-heading mb-2">
            This address does not exist on GlobeX
          </h1>
          <p className="text-sm text-soft leading-relaxed mb-1">
            <span className="font-mono text-xs bg-surface border border-line rounded px-1.5 py-0.5 text-navy">{path}</span>
          </p>
          <p className="text-sm text-soft leading-relaxed mb-6">
            Check the link for typos, or head back to the platform home and navigate from there.
          </p>
          <a
            href="/"
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold"
          >
            <ArrowLeft size={15} />
            Back to GlobeX home
          </a>
        </div>
      </main>
    </div>
  );
}
