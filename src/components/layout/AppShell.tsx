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
  { key: 'presupuestos', label: 'Presupuestos', shortLabel: 'Presup.', icon: FileText, group: 'principal', bottom: true },
  { key: 'ventas', label: 'Ventas', icon: UserCheck, group: 'principal', bottom: true },
  { key: 'comisiones', label: 'Comisiones', icon: BadgePercent, group: 'otros' },
  { key: 'publicidad', label: 'Publicidad', icon: Megaphone, group: 'otros' },
  { key: 'ajustes', label: 'Ajustes', icon: Settings, group: 'otros' },
];

export const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  inicio: { title: 'Inicio', subtitle: 'Lo que hay que hacer hoy' },
  stock: { title: 'Stock', subtitle: 'Unidades disponibles de Autonet' },
  presupuestos: { title: 'Presupuestos', subtitle: 'Lo que enviaste a cada cliente y a quién retomar' },
  ventas: { title: 'Ventas', subtitle: 'Mis ventas, boletos del mes y vendidas por otros' },
  comisiones: { title: 'Comisiones', subtitle: 'Liquidación mensual y premios' },
  publicidad: { title: 'Publicidad', subtitle: 'Historias para Instagram y WhatsApp' },
  ajustes: { title: 'Ajustes', subtitle: 'Tus datos, bancos, mensajes y copia de seguridad' },
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

const BrandMark: React.FC<{ subtitle?: boolean; dark?: boolean }> = ({ dark = false }) => (
  <div className="flex items-center gap-2.5 min-w-0">
    <div className="w-7 h-7 rounded-[7px] bg-brand-600 flex items-center justify-center shrink-0">
      <Car className="w-4 h-4 text-white" />
    </div>
    <span className={`font-bold text-[17px] tracking-[-0.02em] ${dark ? 'text-white' : 'text-slate-900'}`}>autonet</span>
    <span className={`text-[9.5px] font-semibold tracking-[0.12em] rounded px-1.5 py-0.5 border ${dark ? 'text-[#a6aab3] border-[#3a3d45]' : 'text-slate-500 border-slate-300'}`}>PRO</span>
  </div>
);

const Avatar: React.FC<{ size?: string }> = ({ size = 'w-9 h-9' }) => (
  <div
    className={`${size} rounded-full bg-[#2a2d34] text-white flex items-center justify-center text-[11px] font-semibold tracking-wide shrink-0 select-none`}
    title={`${ADVISOR_INFO.nombre} · ${ADVISOR_INFO.cargo}`}
  >
    {ADVISOR_INFO.nombre
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')}
  </div>
);

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

  const go = (tab: NavTab) => {
    onSelectTab(tab);
    setMoreOpen(false);
    window.scrollTo({ top: 0 });
  };


  return (
    <div className="min-h-screen lg:pl-[var(--sidebar-w)]">
      {/* ============ SIDEBAR (escritorio) ============ */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[var(--sidebar-w)] flex-col bg-sidebar text-[#a6aab3] z-40">
        <button type="button" onClick={() => go('inicio')} className="px-5 h-16 flex items-center text-left">
          <BrandMark dark />
        </button>

        <nav className="flex-1 overflow-y-auto scrollbar-none px-3 py-3 space-y-5" aria-label="Navegación principal">
          {(['principal', 'otros'] as const).map((group) => (
            <div key={group}>
              {group === 'otros' && <div className="mx-3 mb-3 border-t border-[#2a2d34]" />}
              <ul className="space-y-0.5">
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
                        className={`relative w-full h-9 flex items-center gap-3 px-2.5 rounded-[7px] text-[13.5px] font-medium transition-colors ${
                          active ? 'bg-[#262930] text-white' : 'text-[#a6aab3] hover:bg-[#1f2228] hover:text-white'
                        }`}
                      >
                        <item.icon className={`w-[17px] h-[17px] shrink-0 ${active ? 'text-white' : 'text-[#7d818b]'}`} />
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {active && <span className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0" aria-hidden="true" />}
                        {badge !== undefined && badge !== 0 && (
                          <span className="text-[12px] font-normal text-[#7d818b] tabular">
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
            <button type="button" onClick={() => install()} className="mx-1 w-[calc(100%-0.5rem)] flex items-center gap-2.5 px-3 py-2 rounded-lg border border-dashed border-[#3a3d45] text-[12px] font-medium text-[#a6aab3] hover:text-white">
              <Download className="w-4 h-4" />
              Instalar app en este equipo
            </button>
          )}
        </nav>

        {/* Usuario + sincronización */}
        <div className="p-3 border-t border-[#2a2d34]">
          <div className="flex items-center gap-2.5 p-2">
            <Avatar size="w-8 h-8" />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-[13px] font-medium text-white truncate">{ADVISOR_INFO.nombre}</div>
              <div className="text-[11.5px] text-[#7d818b] truncate">{user?.email || ADVISOR_INFO.cargo}</div>
            </div>
            {user ? (
              <button type="button" onClick={onLogoutClick} className="p-1.5 rounded-md text-[#7d818b] hover:text-white hover:bg-[#262930]" title="Cerrar sesión">
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={onLoginClick} className="p-1.5 rounded-md text-[#7d818b] hover:text-white hover:bg-[#262930]" title="Iniciar sesión en la nube">
                <LogIn className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between px-1">
            <SyncPill status={syncStatus} plain />
            {!user && (
              <button type="button" onClick={onLoginClick} className="text-[11.5px] font-medium text-white hover:underline">
                Conectar nube
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ============ TOP BAR ============ */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="h-14 lg:h-16 px-4 sm:px-6 lg:px-8 flex items-center gap-3 max-w-[1440px] mx-auto">
          {/* Móvil: marca */}
          <div className="lg:hidden flex-1 min-w-0">
            <BrandMark subtitle={false} />
          </div>

          {/* Escritorio: título de sección */}
          <div className="hidden lg:block flex-1 min-w-0">
            <h1 className="text-[18px] font-semibold text-slate-900 tracking-[-0.01em] leading-tight truncate">{head.title}</h1>
            <p className="text-[12px] text-slate-500 truncate">{head.subtitle}</p>
          </div>

          {currentTab !== 'stock' && (
          <label className="flex items-center gap-2 w-40 sm:w-64 xl:w-80 px-3 h-9 rounded-lg bg-slate-50 focus-within:bg-white border border-slate-200 focus-within:border-slate-900 text-[13.5px] text-slate-500 transition-colors">
            <Search className="w-4 h-4 shrink-0" />
            <input
              id="global-search"
              type="search"
              value={searchValue}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (currentTab !== 'stock') onSelectTab('stock');
              }}
              placeholder="Buscar patente, modelo…"
              className="flex-1 min-w-0 bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
              aria-label="Buscar unidad en el stock"
            />
          </label>
          )}

          <ThemeToggle />

          <div className="lg:hidden">
            <SyncPill status={syncStatus} compact />
          </div>
        </div>
      </header>

      {/* ============ CONTENIDO ============ */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-[calc(var(--bottomnav-h)+1.5rem+env(safe-area-inset-bottom))] lg:pb-10">
        {children}
      </main>

      {/* ============ BOTTOM NAV (celular / tablet) ============ */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 safe-bottom"
        aria-label="Navegación"
      >
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
                className={`relative flex flex-col items-center justify-center gap-1 text-[10.5px] font-bold transition-colors ${
                  active ? 'text-brand-600' : 'text-slate-500'
                }`}
              >
                {active && <span className="absolute top-0 inset-x-5 h-[3px] rounded-b bg-brand-600" />}
                <span className="relative">
                  <item.icon className="w-[22px] h-[22px]" />
                  {item.key !== 'stock' && item.key !== 'inicio' && typeof badge === 'number' && badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-brand-600 text-white text-[9.5px] font-black flex items-center justify-center border-2 border-white">
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
            className={`flex flex-col items-center justify-center gap-1 text-[10.5px] font-bold ${
              !NAV_ITEMS.some((i) => i.bottom && i.key === currentTab) ? 'text-brand-600' : 'text-slate-500'
            }`}
          >
            <MoreHorizontal className="w-[22px] h-[22px]" />
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
      className="w-9 h-9 shrink-0 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 inline-flex items-center justify-center"
      title={dark ? 'Pasar a modo claro' : 'Pasar a modo oscuro'}
      aria-label={dark ? 'Pasar a modo claro' : 'Pasar a modo oscuro'}
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
};
