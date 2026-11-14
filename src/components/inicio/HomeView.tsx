import React from 'react';
import { Search, FileUp, Flame, Receipt, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Vehicle, UpdateHistoryRecord } from '../../types/stock';
import { CommercialBudget } from '../../services/quoteService';
import { stockService } from '../../services/stockService';
import { boletoHistoryService } from '../../services/boletoHistoryService';
import { getBudgetAlerts, todayISO } from '../../utils/budgetAlerts';
import { getAvailableVehicles, getMySoldVehicles } from '../../utils/stockSelectors';
import { isCriticalVehicle } from '../../utils/critical';
import { formatCurrency } from '../../utils/formatters';
import { ADVISOR_INFO } from '../../constants/advisor';
import { FollowUpList } from '../presupuestos/FollowUpList';
import { calculateMonthlyCommissionSummary, COMMISSION_TIERS } from '../../services/commissionService';

interface HomeViewProps {
  vehicles: Vehicle[];
  budgets: CommercialBudget[];
  onSearch: (q: string) => void;
  onOpenVehicle: (v: Vehicle) => void;
  onOpenSale: (v: Vehicle) => void;
  onShowCriticals: () => void;
  onUpdateStock: () => void;
  onGoSales: () => void;
}

const fmtDate = (iso: string) => new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(new Date(iso));

/** INICIO: una sola lista de lo que hay que hacer hoy. */
export const HomeView: React.FC<HomeViewProps> = ({ vehicles, budgets, onSearch, onOpenVehicle, onOpenSale, onShowCriticals, onUpdateStock, onGoSales }) => {
  const [q, setQ] = React.useState('');
  const [history, setHistory] = React.useState<UpdateHistoryRecord[]>(() => stockService.getUpdateHistory());
  React.useEffect(() => stockService.subscribeHistory(setHistory), []);
  const [boletos, setBoletos] = React.useState(() => boletoHistoryService.getAll());
  React.useEffect(() => boletoHistoryService.subscribe(setBoletos), []);

  const month = todayISO().slice(0, 7);
  const alerts = React.useMemo(() => getBudgetAlerts(budgets, vehicles), [budgets, vehicles]);
  const available = React.useMemo(() => getAvailableVehicles(vehicles), [vehicles]);
  const criticals = React.useMemo(
    () => available.filter(isCriticalVehicle).sort((a, b) => (b.fechaActualizacion || '').localeCompare(a.fechaActualizacion || '')),
    [available]
  );
  const mySales = React.useMemo(() => getMySoldVehicles(vehicles), [vehicles]);
  const salesThisMonth = mySales.filter((v) => (v.soldAt || '').slice(0, 7) === month).length;
  const toInvoice = mySales.filter((v) => !v.fechaFacturacion).sort((a, b) => (b.soldAt || '').localeCompare(a.soldAt || ''));
  const boletosThisMonth = boletos.filter((b) => (b.createdAt || '').slice(0, 7) === month).length;
  const last = history[0];

  // Mis ventas de los últimos 6 meses (por fecha de venta)
  const months = React.useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return {
        key,
        label: new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(d).replace('.', ''),
        count: mySales.filter((v) => (v.soldAt || '').slice(0, 7) === key).length,
      };
    });
  }, [mySales]);
  const maxMonth = Math.max(1, ...months.map((m) => m.count));
  const prevMonthSales = months[4]?.count ?? 0;

  // Objetivos del mes (los mismos cálculos que Comisiones)
  const summary = React.useMemo(() => {
    const d = new Date();
    try {
      return calculateMonthlyCommissionSummary(vehicles, d.getFullYear(), d.getMonth() + 1);
    } catch {
      return null;
    }
  }, [vehicles]);
  const goals = summary
    ? [
        { label: 'Volumen de ventas', v: summary.volumenCount, meta: COMMISSION_TIERS.volumen.n1, color: 'bg-[#5b8cff]' },
        { label: 'Mix / críticas', v: summary.criticosCount, meta: COMMISSION_TIERS.criticos.n1, color: 'bg-brand-600' },
        { label: 'Credinet / Wunder', v: summary.credinetCount, meta: COMMISSION_TIERS.credinet.n1, color: 'bg-amber-500' },
        { label: 'Tomas de usado', v: summary.tomasCount, meta: COMMISSION_TIERS.tomas.n1, color: 'bg-emerald-500' },
      ]
    : [];
  const pending = alerts.length + toInvoice.length;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-[-0.02em]">Hola, {ADVISOR_INFO.nombre.split(' ')[0]}</h1>
        <p className="text-[14px] text-slate-500 mt-0.5">
          {pending === 0 ? 'No tenés pendientes para hoy.' : `Tenés ${pending} pendiente${pending > 1 ? 's' : ''} para hoy.`}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(q.trim());
        }}
        className="flex items-center gap-2 px-4 h-12 rounded-xl bg-white border border-slate-200 focus-within:border-slate-400"
      >
        <Search className="w-5 h-5 text-slate-400" />
        <input
          id="home-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en el stock: patente, modelo, año…"
          className="flex-1 bg-transparent outline-none text-[15px] text-slate-900 placeholder:text-slate-400"
        />
        <button type="submit" className="btn btn-sm btn-primary">
          Buscar
        </button>
      </form>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
        <Stat label="Disponibles" value={available.length} />
        <Stat label="Críticas disponibles" value={criticals.length} onClick={onShowCriticals} />
        <Stat label="Mis ventas del mes" value={salesThisMonth} onClick={onGoSales} delta={salesThisMonth - prevMonthSales} />
        <Stat label="Boletos del mes" value={boletosThisMonth} onClick={onGoSales} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <section className="md:col-span-3 autonet-card p-5 flex flex-col gap-4">
          <header className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">Mis ventas por mes</h2>
              <p className="text-[12.5px] text-slate-500 mt-0.5">Unidades vendidas por vos, últimos 6 meses</p>
            </div>
            <span className="font-display text-[24px] font-semibold tabular text-slate-900">{months.reduce((a, m) => a + m.count, 0)}</span>
          </header>
          <div className="h-[150px] flex items-end gap-3 border-b border-slate-200" role="img" aria-label={`Ventas por mes: ${months.map((m) => `${m.label} ${m.count}`).join(', ')}`}>
            {months.map((m, i) => (
              <div key={m.key} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                <span className="text-[12px] font-medium text-slate-600 tabular">{m.count}</span>
                <div
                  className={`w-full max-w-[44px] rounded-t-[8px] rounded-b-[3px] ${i === months.length - 1 ? 'bg-brand-600' : 'bg-slate-200'}`}
                  style={{ height: `${Math.max(4, (m.count / maxMonth) * 112)}px` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 -mt-2">
            {months.map((m) => (
              <span key={m.key} className="flex-1 text-center text-[11.5px] text-slate-500 capitalize">
                {m.label}
              </span>
            ))}
          </div>
        </section>

        <section className="md:col-span-2 autonet-card p-5 flex flex-col gap-3.5">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">Objetivos del mes</h2>
            <p className="text-[12.5px] text-slate-500 mt-0.5">Lo que llevás para el Nivel 1</p>
          </div>
          {goals.map((g) => (
            <div key={g.label} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-700">{g.label}</span>
                <span className="font-semibold tabular text-slate-900">
                  {g.v} <span className="font-normal text-slate-400">/ {g.meta}</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full ${g.color}`} style={{ width: `${Math.min(100, Math.max(3, (g.v / g.meta) * 100))}%` }} />
              </div>
            </div>
          ))}
          {summary && (
            <div className="mt-auto pt-3 border-t border-slate-100 flex items-baseline justify-between">
              <span className="text-[12.5px] text-slate-500">Comisión estimada</span>
              <span className="font-display text-[19px] font-semibold tabular text-slate-900">{formatCurrency(summary.totalGrossEstimated)}</span>
            </div>
          )}
        </section>
      </div>

      <FollowUpList alerts={alerts} onOpenVehicle={onOpenVehicle} title="Clientes para retomar" />

      {toInvoice.length > 0 && (
        <Section icon={<Receipt className="w-4 h-4" />} title="Ventas sin fecha de facturación" count={toInvoice.length} hint="Cambian la comisión del mes">
          {toInvoice.slice(0, 6).map((v) => (
            <Row key={v.patente} onClick={() => onOpenSale(v)} action="Cargar fecha">
              <span className="font-mono text-[12px] font-semibold tracking-[0.04em] text-slate-600 w-[76px] shrink-0">{v.patente}</span>
              <span className="font-medium text-slate-900 truncate">
                {v.marca} {v.modelo}
              </span>
              <span className="text-slate-500 text-[12.5px] truncate">{v.clienteNombre || ''}</span>
              <span className="ml-auto text-[12.5px] text-slate-500 shrink-0">vendida {v.soldAt ? fmtDate(v.soldAt) : ''}</span>
            </Row>
          ))}
        </Section>
      )}

      {criticals.length > 0 && (
        <Section
          icon={<Flame className="w-4 h-4" />}
          title="Unidades críticas disponibles"
          count={criticals.length}
          hint="Suman al premio de mix"
          footer={
            criticals.length > 6 ? (
              <button type="button" onClick={onShowCriticals} className="text-[13px] font-bold text-action-700 hover:underline">
                Ver las {criticals.length} en el stock
              </button>
            ) : undefined
          }
        >
          {criticals.slice(0, 6).map((v) => (
            <Row key={v.patente} onClick={() => onOpenVehicle(v)} action="Abrir">
              <span className="font-mono text-[12px] font-semibold tracking-[0.04em] text-slate-600 w-[76px] shrink-0">{v.patente}</span>
              <span className="font-medium text-slate-900 truncate">
                {v.marca} {v.modelo} <span className="font-normal text-slate-500">{v.anio}</span>
              </span>
              <span className="ml-auto tabular text-[13.5px] font-semibold text-slate-900 shrink-0">{formatCurrency(v.precio)}</span>
            </Row>
          ))}
        </Section>
      )}

      <Section icon={<FileUp className="w-4 h-4" />} title="Último PDF de stock">
        <div className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
          {last ? (
            <div className="text-[13.5px] text-slate-700 flex-1">
              <span className="font-semibold text-slate-900">{fmtDate(last.fecha)}</span> · {last.vehiculosEncontrados} unidades · {last.nuevos} nuevas · {last.modificados}{' '}
              con cambios · {last.noAparecen} ya no figuran
            </div>
          ) : (
            <div className="text-[13.5px] text-slate-500 flex-1">Todavía no subiste ninguna lista.</div>
          )}
          <button type="button" onClick={onUpdateStock} className="btn btn-sm btn-secondary self-start sm:self-auto">
            <FileUp className="w-3.5 h-3.5" /> Actualizar con PDF
          </button>
        </div>
      </Section>

      {pending === 0 && (
        <p className="flex items-center gap-2 text-[13px] text-slate-500">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Todo al día.
        </p>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number; onClick?: () => void; delta?: number }> = ({ label, value, onClick, delta }) => (
  <button type="button" onClick={onClick} disabled={!onClick} className="bg-white px-5 py-4 text-left enabled:hover:bg-slate-50 flex flex-col gap-2">
    <div className="text-[12.5px] text-slate-500">{label}</div>
    <div className="font-display text-[30px] font-semibold tracking-[-0.02em] text-slate-900 tabular leading-none">{value}</div>
    {typeof delta === 'number' && (
      <div className="text-[11.5px] text-slate-500 flex items-center gap-1.5">
        <span
          className={`font-semibold px-1.5 py-0.5 rounded-md ${
            delta > 0 ? 'bg-emerald-50 text-emerald-700' : delta < 0 ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
        vs. mes anterior
      </div>
    )}
  </button>
);

const Section: React.FC<{ icon: React.ReactNode; title: string; count?: number; hint?: string; footer?: React.ReactNode; children: React.ReactNode }> = ({
  icon,
  title,
  count,
  hint,
  footer,
  children,
}) => (
  <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <header className="px-4 sm:px-5 py-4 border-b border-slate-100 flex items-center gap-2">
      <span className="hidden">{icon}</span>
      <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
      {typeof count === 'number' && <span className="text-[13px] text-slate-500 tabular">{count}</span>}
      {hint && <span className="ml-auto text-[12px] text-slate-400">{hint}</span>}
    </header>
    <div className="divide-y divide-slate-100">{children}</div>
    {footer && <div className="px-4 sm:px-5 py-2.5 border-t border-slate-100">{footer}</div>}
  </section>
);

const Row: React.FC<{ onClick: () => void; action: string; children: React.ReactNode }> = ({ onClick, action, children }) => (
  <button type="button" onClick={onClick} className="w-full px-4 sm:px-5 py-2.5 flex items-center gap-3 text-left text-[13.5px] hover:bg-slate-50 group">
    {children}
    <span className="hidden sm:inline text-[12px] font-bold text-action-700 opacity-0 group-hover:opacity-100 shrink-0">{action}</span>
    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
  </button>
);
