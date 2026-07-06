import { useEffect, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';

/**
 * Reads a CSS custom property's *resolved* value (echarts needs real
 * color strings -- canvas can't interpret var(--x) itself).
 * Falls back to the given default if the variable isn't defined yet.
 */
export function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * Thin wrapper around echarts-for-react that:
 * - re-resolves CSS variables whenever the theme (dark/light) toggles,
 *   by watching for attribute/class changes on <html>
 * - keeps background fully transparent so it sits inside our .card style
 */
export default function EChart({ getOption, style, className }) {
  const [themeTick, setThemeTick] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeTick((t) => t + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => observer.disconnect();
  }, []);

  const option = getOption();

  return (
    <div className={className} style={style}>
      <ReactECharts
        option={option}
        notMerge
        lazyUpdate
        opts={{ renderer: 'svg' }}
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
}