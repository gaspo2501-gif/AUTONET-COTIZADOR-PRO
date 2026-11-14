import React from 'react';
import { User as UserIcon, Download, LogIn, LogOut, CheckCircle2, ShieldCheck, Palette } from 'lucide-react';
import { themeService, ThemeMode } from '../../services/themeService';
import { User } from 'firebase/auth';
import { Vehicle } from '../../types/stock';
import { quoteService, AdvisorSettings } from '../../services/quoteService';
import { advisorProfileService } from '../../services/advisorProfileService';
import { backupService } from '../../services/backupService';
import { SyncStatus } from '../../services/firestoreService';
import { SyncPill } from '../layout/AppShell';
import { FinancingEntitiesEditor } from '../consultas/FinancingEntitiesEditor';
import { MessageTemplatesEditor } from '../consultas/MessageTemplatesEditor';

interface SettingsViewProps {
  vehicles: Vehicle[];
  user: User | null;
  syncStatus: SyncStatus;
  onLogin: () => void;
  onLogout: () => void;
  onToast: (t: string, type?: 'success' | 'info' | 'warn') => void;
}

/** AJUSTES: lo que se configura una vez. Sin pantallas técnicas. */
export const SettingsView: React.FC<SettingsViewProps> = ({ vehicles, user, syncStatus, onLogin, onLogout, onToast }) => {
  const [advisor, setAdvisor] = React.useState<AdvisorSettings>(() => quoteService.getAdvisorSettings());
  const [saved, setSaved] = React.useState(false);
  const [lastBackup, setLastBackup] = React.useState<string | null>(() => {
    try {
      return localStorage.getItem('autonet_last_backup_v1');
    } catch {
      return null;
    }
  });
  React.useEffect(() => advisorProfileService.subscribe(() => setAdvisor(quoteService.getAdvisorSettings())), []);
  const [theme, setTheme] = React.useState<ThemeMode>(() => themeService.get());
  React.useEffect(() => themeService.subscribe((m) => setTheme(m)), []);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    quoteService.saveAdvisorSettings(advisor);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const doBackup = () => {
    const { fileName, resumen } = backupService.download();
    const now = new Date().toISOString();
    try {
      localStorage.setItem('autonet_last_backup_v1', now);
    } catch {
      /* sin almacenamiento */
    }
    setLastBackup(now);
    onToast(`Copia descargada (${fileName}): ${resumen.unidades} unidades, ${resumen.presupuestos} presupuestos, ${resumen.boletos} boletos.`, 'success');
  };

  const field = 'field';
  return (
    <div className="max-w-4xl space-y-6">
      <Card title="Tus datos" subtitle="Con estos datos se firman los mensajes de WhatsApp, los presupuestos y las historias." icon={<UserIcon className="w-4 h-4" />}>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="field-label">Nombre y apellido</span>
            <input className={field} value={advisor.nombre} onChange={(e) => setAdvisor({ ...advisor, nombre: e.target.value })} />
          </label>
          <label className="block">
            <span className="field-label">Teléfono / WhatsApp</span>
            <input className={field} value={advisor.telefono} onChange={(e) => setAdvisor({ ...advisor, telefono: e.target.value })} />
          </label>
          <label className="block">
            <span className="field-label">Email (opcional)</span>
            <input className={field} type="email" value={advisor.email || ''} onChange={(e) => setAdvisor({ ...advisor, email: e.target.value })} />
          </label>
          <label className="block">
            <span className="field-label">Sucursal</span>
            <input className={field} value={advisor.sucursal} onChange={(e) => setAdvisor({ ...advisor, sucursal: e.target.value })} />
          </label>
          <div className="sm:col-span-2 flex items-center justify-end gap-3">
            {saved && (
              <span className="text-[13px] font-semibold text-emerald-700 inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Guardado
              </span>
            )}
            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
          </div>
        </form>
      </Card>

      <Card title="Apariencia" subtitle="Se guarda en este dispositivo: podés tener la PC en claro y el celular en oscuro." icon={<Palette className="w-4 h-4" />}>
        <div className="inline-flex p-1 rounded-xl bg-slate-100 gap-1" role="radiogroup" aria-label="Modo de color">
          {([
            ['light', 'Claro'],
            ['dark', 'Oscuro'],
            ['system', 'Automático'],
          ] as [ThemeMode, string][]).map(([m, label]) => (
            <button
              key={m}
              id={`tema-${m}`}
              type="button"
              role="radio"
              aria-checked={theme === m}
              onClick={() => themeService.set(m)}
              className={`h-9 px-4 rounded-lg text-[13px] font-medium ${theme === m ? 'bg-white text-slate-900 border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-slate-500 mt-2">Automático sigue la configuración del teléfono o de la computadora.</p>
      </Card>

      <Card title="Cuenta" subtitle="Tus datos se guardan en tu usuario y se sincronizan entre la PC y el celular." icon={<ShieldCheck className="w-4 h-4" />}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[14px] text-slate-700 flex-1 min-w-[200px]">{user ? user.email : 'Sin iniciar sesión (los datos quedan solo en este dispositivo)'}</div>
          <SyncPill status={syncStatus} />
          {user ? (
            <button type="button" onClick={onLogout} className="btn btn-secondary">
              <LogOut className="w-4 h-4" /> Cerrar sesión
            </button>
          ) : (
            <button type="button" onClick={onLogin} className="btn btn-primary">
              <LogIn className="w-4 h-4" /> Iniciar sesión
            </button>
          )}
        </div>
      </Card>

      <Card
        title="Copia de seguridad"
        subtitle="Descarga en un archivo todo lo tuyo: stock con ventas y comisiones, historial de cargas, presupuestos, boletos y ajustes. No cambia nada en la app."
        icon={<Download className="w-4 h-4" />}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[13.5px] text-slate-600 flex-1 min-w-[200px]">
            {vehicles.length} unidades guardadas ·{' '}
            {lastBackup ? `última copia: ${new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastBackup))}` : 'todavía no hiciste ninguna copia'}
          </div>
          <button type="button" id="btn-backup" onClick={doBackup} className="btn btn-primary">
            <Download className="w-4 h-4" /> Descargar copia completa
          </button>
        </div>
      </Card>

      <FinancingEntitiesEditor onToast={onToast} />
      <MessageTemplatesEditor sampleVehicle={vehicles.find((v) => v.estado === 'Disponible')} onToast={onToast} />
    </div>
  );
};

const Card: React.FC<{ title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, subtitle, icon, children }) => (
  <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
    <h2 className="text-[15px] font-bold text-slate-900 inline-flex items-center gap-2">
      <span className="text-slate-400">{icon}</span>
      {title}
    </h2>
    {subtitle && <p className="text-[13px] text-slate-500 mt-0.5 mb-4">{subtitle}</p>}
    {children}
  </section>
);
