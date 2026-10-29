import { useCallback, useEffect, useState } from 'react';

export function useFadeIn() {
  const [node, setNode] = useState(null);
  const [visible, setVisible] = useState(false);

  // Callback ref: gives us the element without reading ref.current during render.
  const ref = useCallback((el) => {
    setNode(el);
  }, []);

  useEffect(() => {
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return [ref, `fade-in${visible ? ' visible' : ''}`];
}
