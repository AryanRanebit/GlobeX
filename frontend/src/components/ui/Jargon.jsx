import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

// Plain-language glossary for the trade jargon a first-time exporter meets
// in the dashboard. Tap (mobile) or hover (desktop) the dotted term to see
// the explanation; tap anywhere else or press Escape to dismiss.
const GLOSSARY = {
  'HS code':
    'Harmonized System code - the worldwide number customs uses to classify a product. Example: 0910.30 is turmeric, 62 is apparel.',
  'FOB':
    'Free on Board - the value of goods at the Indian port, before international shipping and insurance are added. Most export statistics are reported this way.',
  'CIF':
    'Cost, Insurance and Freight - the FOB value plus shipping and insurance to the buyer\'s port. Roughly what the importer pays landed.',
  'tariff':
    'A tax the destination country charges on imported goods, usually a percentage of the product value. It directly affects your landed price.',
  'CAGR':
    'Compound Annual Growth Rate - the smoothed average yearly growth over a period, ignoring year-to-year ups and downs.',
  'lead score':
    'A 0-100 rating of how promising a buyer looks, based on the public evidence found about them (website, registry, trade signals). Higher is warmer.',
  'trade volume':
    'The total money value of goods traded in a period, as reported to the UN by the exporting country.',
  'FTA':
    'Free Trade Agreement - a deal between countries that lowers or removes import taxes on covered goods.',
};

export default function Term({ t, children, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const definition = GLOSSARY[t];

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!definition) return <span className={className}>{children ?? t}</span>;

  return (
    <span ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`What does ${t} mean?`}
        className="group/t inline-flex items-center gap-0.5 cursor-help border-b border-dotted border-faint text-inherit"
      >
        <span>{children ?? t}</span>
        <HelpCircle size={10} className="shrink-0 opacity-60" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        className={`absolute left-0 bottom-full mb-1.5 z-40 w-56 rounded-lg border border-line bg-navy p-2.5 text-left text-[11px] font-normal normal-case tracking-normal leading-snug text-white shadow-[var(--shadow-pop)] ${
          open ? 'block' : 'hidden'
        } md:group-hover/t:block`}
      >
        <strong className="mb-0.5 block">{t}</strong>
        {definition}
      </span>
    </span>
  );
}
