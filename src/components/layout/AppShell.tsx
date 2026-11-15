import React from 'react';
import {
  Car,
  UserCheck,
  BadgePercent,
  FileText,
  Settings,
  Search,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  LogIn,
  LogOut,
  Download,
  MoreHorizontal,
  X,
  Megaphone,
  Home,
  Sun,
  Moon,
  Bell,
  CalendarDays,
} from 'lucide-react';
import { themeService } from '../../services/themeService';
import { User } from 'firebase/auth';
import { SyncStatus } from '../../services/firestoreService';
import { ADVISOR_INFO } from '../../constants/advisor';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useModalBehavior } from '../../hooks/useModalBehavior';

export type NavTab = 'inicio' | 'stock' | 'presupuestos' | 'ventas' | 'comisiones' | 'publicidad' | 'ajustes' | 'actualizar';

interface NavItem {
  key: NavTab;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'principal' | 'otros';
  /** Aparece en la barra inferior del celular (el resto va en "Más"). */
  bottom?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'inicio', label: 'Inicio', icon: Home, group: 'principal', bottom: true },
  { key: 'stock', label: 'Stock', icon: Car, group: 'principal', bottom: true },
  { key: 'presupuestos', label: 'Cotizaciones', shortLabel: 'Cotiz.', icon: FileText, group: 'principal', bottom: true },
  { key: 'ventas', label: 'Ventas', icon: UserCheck, group: 'principal', bottom: true },
  { key: 'comisiones', label: 'Comisiones', icon: BadgePercent, group: 'otros' },
  { key: 'publicidad', label: 'Publicidad', icon: Megaphone, group: 'otros' },
  { key: 'ajustes', label: 'Configuración', icon: Settings, group: 'otros' },
];

export const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  inicio: { title: 'Panel de Control', subtitle: 'Resumen de tu trabajo en un vistazo' },
  stock: { title: 'Stock de usados', subtitle: 'Unidades de Autonet: encontrá, cotizá y marcá su estado' },
  presupuestos: { title: 'Cotizaciones y presupuestos', subtitle: 'Lo que enviaste a cada cliente y a quién retomar' },
  ventas: { title: 'Ventas', subtitle: 'Mis ventas, boletos del mes y vendidas por otros' },
  comisiones: { title: 'Comisiones', subtitle: 'Liquidación mensual y premios' },
  publicidad: { title: 'Publicidad', subtitle: 'Historias para Instagram y WhatsApp' },
  ajustes: { title: 'Configuración', subtitle: 'Tus datos, apariencia, bancos, mensajes y copia de seguridad' },
  actualizar: { title: 'Actualizar con PDF', subtitle: 'Cargar la lista oficial de stock' },
};

interface AppShellProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  badges: Partial<Record<NavTab, number | string>>;
  syncStatus: SyncStatus;
  user: User | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  searchValue: string;
  onSearchChange: (q: string) => void;
  children: React.ReactNode;
}

const SYNC_META: Record<SyncStatus, { label: string; cls: string; dot: string; Icon: React.ComponentType<{ className?: string }> }> = {
  synced: { label: 'Nube OK', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', Icon: Cloud },
  syncing: { label: 'Sincronizando', cls: 'text-slate-700 bg-slate-100 border-slate-200', dot: 'bg-amber-500', Icon: RefreshCw },
  error: { label: 'Error de nube', cls: 'text-brand-700 bg-brand-50 border-brand-200', dot: 'bg-brand-600', Icon: AlertCircle },
  offline: { label: 'Modo local', cls: 'text-slate-600 bg-slate-100 border-slate-200', dot: 'bg-slate-400', Icon: CloudOff },
};

export const SyncPill: React.FC<{ status: SyncStatus; compact?: boolean; plain?: boolean }> = ({ status, compact, plain }) => {
  const m = SYNC_META[status] || SYNC_META.offline;
  if (plain)
    return (
      <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[#7d818b]" title={m.label}>
        <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
        {m.label}
      </span>
    );
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border text-[11.5px] font-medium ${compact ? 'px-2 py-1' : 'px-2.5 py-1'} ${m.cls}`}
      title={m.label}
    >
      <m.Icon className={`w-3.5 h-3.5 ${status === 'syncing' ? 'animate-spin' : ''}`} />
      {!compact && <span>{m.label}</span>}
    </span>
  );
};

/** Logo Autonet: auto en trazo + "autonet" + "Tus sueños en marcha". */
export const BrandMark: React.FC<{ subtitle?: boolean; dark?: boolean; compact?: boolean }> = ({ dark = false, subtitle = true, compact = false }) => (
  <div className={`flex flex-col ${compact ? 'items-start' : 'items-center'} min-w-0 leading-none select-none`}>
    {!compact && (
      <svg width="118" height="22" viewBox="0 0 118 22" fill="none" aria-hidden="true" className="mb-0.5">
        <path
          d="M6 19c3-6 9-9 18-10l14-1c8-5 18-8 30-7 11 1 20 5 26 10 6 1 12 2 18 6"
          stroke={dark ? '#ffffff' : '#121c33'}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </svg>
    )}
    <span className={`font-extrabold tracking-[-0.03em] ${compact ? 'text-[22px]' : 'text-[30px]'} ${dark ? 'text-white' : 'text-slate-900'}`}>
      auto<span className="text-brand-600">net</span>
    </span>
    {subtitle && <span className={`mt-1 text-[11.5px] font-medium tracking-wide ${dark ? 'text-white/70' : 'text-slate-500'}`}>Tus sueños en marcha</span>}
  </div>
);

const Avatar: React.FC<{ size?: string }> = ({ size = 'w-9 h-9' }) => (
  <div
    className={`${size} rounded-full bg-gradient-to-br from-[#3b6cf0] to-[#1c44b8] text-white flex items-center justify-center text-[12px] font-bold tracking-wide shrink-0 select-none ring-2 ring-white/15`}
    title={`${ADVISOR_INFO.nombre} · ${ADVISOR_INFO.cargo}`}
  >
    {ADVISOR_INFO.nombre
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')}
  </div>
);

/** Fecha y hora de la barra superior ("Vie. 14 de Noviembre · 14:32 hs"). */
const useNow = () => {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onSelectTab,
  badges,
  syncStatus,
  user,
  onLoginClick,
  onLogoutClick,
  searchValue,
  onSearchChange,
  children,
}) => {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const { isInstallable, install } = usePWAInstall();
  const head = TAB_TITLES[currentTab];
  const now = useNow();
  const alerts = Number(badges.inicio || 0);
  const dayLabel = `${cap(new Intl.DateTimeFormat('es-AR', { weekday: 'short' }).format(now).replace('.', ''))}. ${now.getDate()} de ${cap(
    new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(now)
  )}`;
  const timeLabel = `${new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now)} hs`;

  const go = (tab: NavTab) => {
    onSelectTab(tab);
    setMoreOpen(false);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen lg:pl-[var(--sidebar-w)]">
      {/* ============ MENÚ LATERAL (escritorio) ============ */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[var(--sidebar-w)] flex-col bg-sidebar text-white/75 z-40">
        <button type="button" onClick={() => go('inicio')} className="pt-7 pb-8 flex justify-center" aria-label="Ir al inicio">
          <BrandMark dark />
        </button>

        <nav className="flex-1 overflow-y-auto scrollbar-none px-4 space-y-6" aria-label="Navegación principal">
          {(['principal', 'otros'] as const).map((group) => (
            <div key={group}>
              <div className="px-3 mb-2 text-[11px] font-semibold tracking-[0.08em] uppercase text-white/40">{group === 'principal' ? 'Principal' : 'Gestión'}</div>
              <ul className="space-y-1">
                {NAV_ITEMS.filter((i) => i.group === group).map((item) => {
                  const active = currentTab === item.key || (item.key === 'stock' && currentTab === 'actualizar');
                  const badge = badges[item.key];
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        id={`nav-tab-${item.key}`}
                        onClick={() => go(item.key)}
                        aria-current={active ? 'page' : undefined}
                        className={`relative w-full h-11 flex items-center gap-3.5 px-3.5 rounded-xl text-[14.5px] font-semibold transition-colors ${
                          active
                            ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-[0_8px_20px_-8px_rgba(225,29,46,0.7)]'
                            : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <item.icon className={`w-[20px] h-[20px] shrink-0 ${active ? 'text-white' : 'text-white/70'}`} />
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {badge !== undefined && badge !== 0 && (
                          <span
                            className={`min-w-6 h-6 px-1.5 rounded-full text-[11.5px] font-bold tabular flex items-center justify-center ${
                              active ? 'bg-white/25 text-white' : 'bg-white/10 text-white/80'
                            }`}
                          >
                            {badge}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {isInstallable && (
            <button type="button" onClick={() => install()} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-dashed border-white/20 text-[12.5px] font-medium text-white/70 hover:text-white">
              <Download className="w-4 h-4" />
              Instalar app en este equipo
            </button>
          )}
        </nav>

        {/* Perfil + sincronización + salir */}
        <div className="px-4 pb-4 pt-3 border-t border-white/10 space-y-1">
          <div className="flex items-center gap-3 p-2">
            <Avatar size="w-10 h-10" />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-[13.5px] font-bold text-white truncate">{ADVISOR_INFO.nombre}</div>
              <div className="text-[11.5px] text-white/55 truncate">{ADVISOR_INFO.cargo || 'Asesor Comercial'}</div>
            </div>
            <SyncDot status={syncStatus} />
          </div>
          {user ? (
            <button type="button" onClick={onLogoutClick} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-white/70 hover:text-white hover:bg-white/[0.06]">
              <LogOut className="w-[18px] h-[18px]" /> Cerrar sesión
            </button>
          ) : (
            <button type="button" onClick={onLoginClick} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-white/70 hover:text-white hover:bg-white/[0.06]">
              <LogIn className="w-[18px] h-[18px]" /> Iniciar sesión
            </button>
          )}
        </div>
      </aside>

      {/* ============ BARRA SUPERIOR ============ */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/70">
        <div className="h-14 lg:h-[72px] px-4 sm:px-6 lg:px-8 flex items-center gap-3 lg:gap-4 max-w-[1480px] mx-auto">
          <div className="lg:hidden flex-1 min-w-0">
            <BrandMark compact subtitle={false} />
          </div>

          <label className="hidden lg:flex flex-1 max-w-[760px] items-center gap-3 px-4 h-12 rounded-2xl bg-slate-50 border border-slate-200 focus-within:bg-white focus-within:border-blue-400 focus-within:shadow-[0_0_0_3px_rgba(59,108,240,0.12)] text-slate-400 transition">
            <Search className="w-5 h-5 shrink-0" />
            <input
              id="global-search"
              type="search"
              value={searchValue}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (currentTab !== 'stock') onSelectTab('stock');
              }}
              placeholder="Buscar por marca, modelo, patente…"
              className="flex-1 min-w-0 bg-transparent outline-none text-[15px] text-slate-900 placeholder:text-slate-500"
              aria-label="Buscar unidad en el stock"
            />
            <kbd className="text-[11.5px] font-semibold text-slate-500 border border-slate-200 bg-white rounded-md px-2 py-0.5">/</kbd>
          </label>
          <div className="hidden lg:block flex-1" />

          <ThemeToggle />

          <button
            type="button"
            id="btn-avisos"
            onClick={() => go('inicio')}
            className="relative w-10 h-10 shrink-0 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center"
            title={alerts ? `${alerts} pendiente${alerts > 1 ? 's' : ''} para hoy` : 'Sin pendientes'}
            aria-label={alerts ? `Avisos: ${alerts} pendientes` : 'Avisos: sin pendientes'}
          >
            <Bell className="w-[22px] h-[22px]" />
            {alerts > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-600 text-white text-[10.5px] font-bold flex items-center justify-center border-2 border-white">
                {alerts}
              </span>
            )}
          </button>

          <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-slate-200">
            <CalendarDays className="w-[22px] h-[22px] text-slate-600" />
            <div className="leading-tight">
              <div className="text-[13.5px] font-bold text-slate-900 whitespace-nowrap">{dayLabel}</div>
              <div className="text-[12px] text-slate-500 tabular">{timeLabel}</div>
            </div>
          </div>

          <div className="lg:hidden">
            <SyncPill status={syncStatus} compact />
          </div>
        </div>
      </header>

      {/* ============ CONTENIDO ============ */}
      <main className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-[calc(var(--bottomnav-h)+1.5rem+env(safe-area-inset-bottom))] lg:pb-12">
        {currentTab !== 'inicio' && (
          <div className="mb-6">
            <h1 className="page-title">{head.title}</h1>
            <p className="text-[14.5px] text-slate-500 mt-1">{head.subtitle}</p>
            <span className="page-title-accent" aria-hidden="true" />
          </div>
        )}
        {children}
      </main>

      {/* ============ MENÚ INFERIOR (celular / tablet) ============ */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar safe-bottom" aria-label="Navegación">
        <div className="grid grid-cols-5 h-[var(--bottomnav-h)]">
          {NAV_ITEMS.filter((i) => i.bottom).map((item) => {
            const active = currentTab === item.key;
            const badge = badges[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => go(item.key)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 text-[10.5px] font-semibold transition-colors ${active ? 'text-white' : 'text-white/60'}`}
              >
                <span className={`relative w-12 h-7 rounded-full flex items-center justify-center ${active ? 'bg-brand-600' : ''}`}>
                  <item.icon className="w-[20px] h-[20px]" />
                  {item.key !== 'stock' && item.key !== 'inicio' && typeof badge === 'number' && badge > 0 && (
                    <span className="absolute -top-1 right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-brand-600 text-white text-[9.5px] font-bold flex items-center justify-center border-2 border-sidebar">
                      {badge}
                    </span>
                  )}
                </span>
                <span>{item.shortLabel || item.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-1 text-[10.5px] font-semibold ${
              !NAV_ITEMS.some((i) => i.bottom && i.key === currentTab) ? 'text-white' : 'text-white/60'
            }`}
          >
            <span className={`w-12 h-7 rounded-full flex items-center justify-center ${!NAV_ITEMS.some((i) => i.bottom && i.key === currentTab) ? 'bg-brand-600' : ''}`}>
              <MoreHorizontal className="w-[20px] h-[20px]" />
            </span>
            <span>Más</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <MoreSheet
          onClose={() => setMoreOpen(false)}
          currentTab={currentTab}
          onGo={go}
          user={user}
          syncStatus={syncStatus}
          onLoginClick={() => {
            setMoreOpen(false);
            onLoginClick();
          }}
          onLogoutClick={() => {
            setMoreOpen(false);
            onLogoutClick();
          }}
          isInstallable={isInstallable}
          onInstall={() => {
            setMoreOpen(false);
            install();
          }}
        />
      )}
    </div>
  );
};

/** Punto de estado de la nube (verde = sincronizado). */
const SyncDot: React.FC<{ status: SyncStatus }> = ({ status }) => {
  const m = SYNC_META[status] || SYNC_META.offline;
  return <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${m.dot} ring-4 ring-white/10`} title={m.label} aria-label={m.label} role="img" />;
};

const MoreSheet: React.FC<{
  onClose: () => void;
  currentTab: NavTab;
  onGo: (t: NavTab) => void;
  user: User | null;
  syncStatus: SyncStatus;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  isInstallable: boolean;
  onInstall: () => void;
}> = ({ onClose, currentTab, onGo, user, syncStatus, onLoginClick, onLogoutClick, isInstallable, onInstall }) => {
  useModalBehavior(onClose);
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Más opciones">
      <div className="absolute inset-0 bg-slate-950/50 anim-fade" onClick={onClose} />
      <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-[var(--shadow-sheet)] anim-sheet safe-bottom">
        <div className="flex justify-center pt-2.5">
          <span className="w-10 h-1.5 rounded-full bg-slate-200" />
        </div>
        <div className="px-5 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar size="w-10 h-10" />
            <div className="leading-tight">
              <div className="text-sm font-bold text-slate-900">{ADVISOR_INFO.nombre}</div>
              <div className="text-xs text-slate-500">{user?.email || ADVISOR_INFO.cargo}</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-3 pb-3 space-y-1">
          {NAV_ITEMS.filter((i) => !i.bottom).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onGo(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold ${
                currentTab === item.key ? 'bg-brand-50 text-brand-700' : 'text-slate-700 active:bg-slate-100'
              }`}
            >
              <item.icon className={`w-5 h-5 ${currentTab === item.key ? 'text-brand-600' : 'text-slate-400'}`} />
              {item.label}
            </button>
          ))}
          {isInstallable && (
            <button type="button" onClick={onInstall} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-700 active:bg-slate-100">
              <Download className="w-5 h-5 text-slate-400" />
              Instalar app
            </button>
          )}
        </div>
        <div className="mx-5 mb-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
          <SyncPill status={syncStatus} />
          {user ? (
            <button type="button" onClick={onLogoutClick} className="btn btn-sm btn-secondary">
              <LogOut className="w-3.5 h-3.5" /> Salir
            </button>
          ) : (
            <button type="button" onClick={onLoginClick} className="btn btn-sm btn-dark">
              <LogIn className="w-3.5 h-3.5" /> Conectar nube
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/** Botón rápido claro / oscuro de la barra de arriba. */
const ThemeToggle: React.FC = () => {
  const [dark, setDark] = React.useState(() => themeService.isDark());
  React.useEffect(() => themeService.subscribe((_m, d) => setDark(d)), []);
  return (
    <button
      type="button"
      id="theme-toggle"
      onClick={() => themeService.toggle()}
      className="w-10 h-10 shrink-0 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center"
      title={dark ? 'Pasar a modo claro' : 'Pasar a modo oscuro'}
      aria-label={dark ? 'Pasar a modo claro' : 'Pasar a modo oscuro'}
    >
      {dark ? <Sun className="w-[20px] h-[20px]" /> : <Moon className="w-[20px] h-[20px]" />}
    </button>
  );
};
