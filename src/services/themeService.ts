/**
 * MODO CLARO / OSCURO
 * Se guarda en este dispositivo (cada uno elige: la PC puede estar clara y el celular oscuro).
 * 'system' sigue la configuración del teléfono o de la computadora.
 */
export type ThemeMode = 'light' | 'dark' | 'system';

const KEY = 'autonet_theme_v1';
const listeners = new Set<(mode: ThemeMode, dark: boolean) => void>();
const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

const read = (): ThemeMode => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'dark' || v === 'light' || v === 'system' ? v : 'light';
  } catch {
    return 'light';
  }
};

const isDark = (mode: ThemeMode) => mode === 'dark' || (mode === 'system' && !!media?.matches);

const apply = (mode: ThemeMode) => {
  const dark = isDark(mode);
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#07090d' : '#17213a');
  listeners.forEach((l) => l(mode, dark));
};

media?.addEventListener?.('change', () => {
  if (read() === 'system') apply('system');
});

export const themeService = {
  get: read,
  isDark: () => isDark(read()),
  set(mode: ThemeMode) {
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* sin almacenamiento: igual se aplica en esta sesión */
    }
    apply(mode);
  },
  toggle() {
    themeService.set(themeService.isDark() ? 'light' : 'dark');
  },
  init: () => apply(read()),
  subscribe(l: (mode: ThemeMode, dark: boolean) => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
