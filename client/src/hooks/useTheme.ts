import { createContext, useContext, useEffect, useState } from 'react';
import type { ThemePreference } from '@weatherwiz/shared';

const media = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

/** Resolves the theme preference to light/dark and keeps <html class="dark"> in sync. */
export function useResolvedTheme(pref: ThemePreference): 'light' | 'dark' {
  const [systemDark, setSystemDark] = useState(() => media()?.matches ?? false);

  useEffect(() => {
    const mq = media();
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved = pref === 'system' ? (systemDark ? 'dark' : 'light') : pref;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'dark' ? '#0b1220' : '#f4f7fb');
  }, [resolved]);

  return resolved;
}

export const ResolvedThemeContext = createContext<'light' | 'dark'>('light');
export const useIsDark = () => useContext(ResolvedThemeContext) === 'dark';
