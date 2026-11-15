import React from 'react';
import { Search, Car, Handshake, CheckCircle2, DollarSign, BarChart3, PieChart, Clock, ArrowRight, Gauge, Fuel, Cog, FileUp, Receipt, FileText, UserCheck, ArrowUp, ArrowDown } from 'lucide-react';
import { Vehicle, UpdateHistoryRecord } from '../../types/stock';
import { CommercialBudget } from '../../services/quoteService';
import { stockService } from '../../services/stockService';
import { boletoHistoryService } from '../../services/boletoHistoryService';
import { getBudgetAlerts } from '../../utils/budgetAlerts';
import { getAvailableVehicles, getMySoldVehicles, isActiveVehicle, isReservedVehicle, normalizeCommercialStatus } from '../../utils/stockSelectors';
import { isCriticalVehicle } from '../../utils/critical';
import { formatCurrency, formatKm } from '../../utils/formatters';
import { FollowUpList } from '../presupuestos/FollowUpList';
import { VehiclePhoto } from '../ui/VehiclePhoto';
import { StatusBadge } from '../ui/StatusBadge';
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

type Range = '7d' | '30d' | '3m' | '12m';
const DAY = 86_400_000;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ym = (d: Date) => ymd(d).slice(0, 7);
const saleAmount = (v: Vehicle) => v.precioRealVenta || v.soldPrice || v.precio || 0;
const monthName = (d: Date, style: 'short' | 'long' = 'short') => {
  const s = new Intl.DateTimeFormat('es-AR', { month: style }).format(d).replace('.', '');
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const moneyShort = (n: number) =>
  n >= 1_000_000 ? `$ ${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} M` : formatCurrency(n);

/** PANEL DE CONTROL: indicadores reales, evolución, estado del stock, actividad y pendientes. */
export const HomeView: React.FC<HomeViewProps> = ({ vehicles, budgets, onSearch, onOpenVehicle, onOpenSale, onShowCriticals, onUpdateStock, onGoSales }) => {
  const [q, setQ] = React.useState('');
  const [range, setRange] = React.useState<Range>('30d');
  const [history, setHistory] = React.useState<UpdateHistoryRecord[]>(() => stockService.getUpdateHistory());
  React.useEffect(() => stockService.subscribeHistory(setHistory), []);
  const [boletos, setBoletos] = React.useState(() => boletoHistoryService.getAll());
  React.useEffect(() => boletoHistoryService.subscribe(setBoletos), []);

  const now = new Date();
  const thisMonth = ym(now);
  const prevMonth = ym(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const alerts = React.useMemo(() => getBudgetAlerts(budgets, vehicles), [budgets, vehicles]);
  const active = React.useMemo(() => vehicles.filter(isActiveVehicle), [vehicles]);
  const available = React.useMemo(() => getAvailableVehicles(vehicles), [vehicles]);
  const reserved = React.useMemo(() => vehicles.filter(isReservedVehicle), [vehicles]);
  const mySales = React.useMemo(() => getMySoldVehicles(vehicles), [vehicles]);
  const criticals = React.useMemo(() => available.filter(isCriticalVehicle), [available]);
  const toInvoice = mySales.filter((v) => !v.fechaFacturacion).sort((a, b) => (b.soldAt || '').localeCompare(a.soldAt || ''));

  const salesIn = (key: string) => mySales.filter((v) => (v.soldAt || '').slice(0, 7) === key);
  const soldThis = salesIn(thisMonth);
  const soldPrev = salesIn(prevMonth);
  const amountThis = soldThis.reduce((a, v) => a + saleAmount(v), 0);
  const amountPrev = soldPrev.reduce((a, v) => a + saleAmount(v), 0);
  const last6 = Array.from({ length: 6 }, (_, i) => ym(new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)));
  const last = history[0];

  const kpis = [
    {
      key: 'stock',
      icon: Car,
      tone: 'bg-blue-50 text-blue-600',
      line: '#3b6cf0',
      value: String(active.length),
      label: 'Unidades en stock',
      delta: last ? last.nuevos : undefined,
      deltaText: last ? `${last.nuevos >= 0 ? '+' : ''}${last.nuevos}` : '',
      hint: last ? 'nuevas en el último PDF' : '',
      series: history.slice(0, 8).reverse().map((h) => h.vehiculosEncontrados),
    },
    {
      key: 'reservadas',
      icon: Handshake,
      tone: 'bg-emerald-50 text-emerald-600',
      line: '#22b26b',
      value: String(reserved.length),
      label: 'Reservadas',
      hint: active.length ? `${Math.round((reserved.length / active.length) * 100)}% del stock activo` : '',
      series: [] as number[],
    },
    {
      key: 'vendidas',
      icon: CheckCircle2,
      tone: 'bg-sky-50 text-sky-600',
      line: '#0ea5e9',
      value: String(soldThis.length),
      label: 'Mis vendidas (mes)',
      delta: soldThis.length - soldPrev.length,
      deltaText: `${soldThis.length - soldPrev.length >= 0 ? '+' : ''}${soldThis.length - soldPrev.length}`,
      hint: 'vs. mes anterior',
      series: last6.map((k) => salesIn(k).length),
    },
    {
      key: 'monto',
      icon: DollarSign,
      tone: 'bg-brand-50 text-brand-600',
      line: '#e11d2e',
      value: moneyShort(amountThis),
      label: 'Mis ventas del mes',
      delta: amountPrev ? amountThis - amountPrev : undefined,
      deltaText: amountPrev ? `${amountThis >= amountPrev ? '+' : ''}${Math.round(((amountThis - amountPrev) / amountPrev) * 100)}%` : '',
      hint: amountPrev ? 'vs. mes anterior' : 'precio de venta de tus unidades',
      series: last6.map((k) => salesIn(k).reduce((a, v) => a + saleAmount(v), 0)),
    },
  ];

  // Evolución de mis ventas
  const evo = React.useMemo(() => {
    const day = (s?: string) => (s || '').slice(0, 10);
    if (range === '12m') {
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        const k = ym(d);
        return { label: monthName(d), value: mySales.filter((v) => (v.soldAt || '').slice(0, 7) === k).length };
      });
    }
    if (range === '3m') {
      return Array.from({ length: 13 }, (_, i) => {
        const end = new Date(now.getTime() - (12 - i) * 7 * DAY);
        const start = new Date(end.getTime() - 6 * DAY);
        const a = ymd(start);
        const b = ymd(end);
        return { label: `${end.getDate()}/${end.getMonth() + 1}`, value: mySales.filter((v) => day(v.soldAt) >= a && day(v.soldAt) <= b).length };
      });
    }
    const n = range === '7d' ? 7 : 30;
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(now.getTime() - (n - 1 - i) * DAY);
      const k = ymd(d);
      return { label: `${d.getDate()}/${d.getMonth() + 1}`, value: mySales.filter((v) => day(v.soldAt) === k).length };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, mySales]);
  const evoTotal = evo.reduce((a, p) => a + p.value, 0);

  // Estado del stock
  const soldMonthAll = vehicles.filter((v) => normalizeCommercialStatus(v.estado) === 'Vendido' && (v.soldAt || '').slice(0, 7) === thisMonth).length;
  const donut = [
    { label: 'Disponibles', value: available.length, color: '#22b26b' },
    { label: 'Reservadas', value: reserved.length, color: '#3b6cf0' },
    { label: 'Vendidas (mes)', value: soldMonthAll, color: '#e11d2e' },
    { label: 'Críticas', value: criticals.length, color: '#f29b11', note: true },
  ];

  // Actividad reciente (todo sale de lo que ya está guardado)
  const activity = React.useMemo(() => {
    const items: { at: string; title: string; detail: string; icon: React.ComponentType<{ className?: string }>; tone: string; onClick?: () => void }[] = [];
    mySales.forEach((v) => v.soldAt && items.push({ at: v.soldAt, title: 'Nueva venta registrada', detail: `${v.marca} ${v.modelo} ${v.anio}${v.clienteNombre ? ` · ${v.clienteNombre}` : ''}`, icon: Car, tone: 'bg-blue-50 text-blue-600', onClick: () => onOpenSale(v) }));
    vehicles
      .filter((v) => v.saleOwner === 'other' && v.soldAt)
      .forEach((v) => items.push({ at: v.soldAt!, title: 'Vendida por otro asesor', detail: `${v.marca} ${v.modelo} ${v.anio}`, icon: UserCheck, tone: 'bg-slate-100 text-slate-500' }));
    budgets.forEach((b) =>
      items.push({ at: b.fechaEmision, title: 'Cotización creada', detail: `${b.vehiculo?.marca || ''} ${b.vehiculo?.modelo || ''}${b.datosCliente?.nombre ? ` · ${b.datosCliente.nombre}` : ''}`, icon: FileText, tone: 'bg-violet-50 text-violet-600' })
    );
    boletos.forEach((b) => items.push({ at: b.createdAt, title: 'Boleto generado', detail: `${b.vehiculo.marca} ${b.vehiculo.modelo} · ${b.clienteNombre}`, icon: Receipt, tone: 'bg-brand-50 text-brand-600' }));
    history.forEach((h) => items.push({ at: h.fecha, title: 'Stock actualizado con PDF', detail: `${h.vehiculosEncontrados} unidades · ${h.nuevos} nuevas`, icon: FileUp, tone: 'bg-emerald-50 text-emerald-600' }));
    return items.filter((i) => i.at).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
  }, [mySales, vehicles, budgets, boletos, history, onOpenSale]);

  // Destacados: críticas primero, después las últimas que ingresaron; las que tienen foto adelante
  const featured = React.useMemo(() => {
    const hasPhoto = (v: Vehicle) => (v.fotoPrincipal || v.fotos?.[0] ? 1 : 0);
    return [...available]
      .sort(
        (a, b) =>
          Number(isCriticalVehicle(b)) - Number(isCriticalVehicle(a)) ||
          hasPhoto(b) - hasPhoto(a) ||
          (b.fechaIncorporacion || '').localeCompare(a.fechaIncorporacion || '')
      )
      .slice(0, 4);
  }, [available]);
  const heroCars = available.filter((v) => v.fotoPrincipal || v.fotos?.[0]).slice(0, 3);

  const summary = React.useMemo(() => {
    try {
      return calculateMonthlyCommissionSummary(vehicles, now.getFullYear(), now.getMonth() + 1);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles]);
  const goals = summary
    ? [
        { label: 'Volumen de ventas', v: summary.volumenCount, meta: COMMISSION_TIERS.volumen.n1, color: 'bg-blue-500' },
        { label: 'Mix / críticas', v: summary.criticosCount, meta: COMMISSION_TIERS.criticos.n1, color: 'bg-brand-600' },
        { label: 'Credinet / Wunder', v: summary.credinetCount, meta: COMMISSION_TIERS.credinet.n1, color: 'bg-amber-500' },
        { label: 'Tomas de usado', v: summary.tomasCount, meta: COMMISSION_TIERS.tomas.n1, color: 'bg-emerald-500' },
      ]
    : [];

  const pending = alerts.length + toInvoice.length;

  return (
    <div className="space-y-6">
      {/* ===== ENCABEZADO ===== */}
      <section className="relative overflow-hidden rounded-[20px] min-h-[132px] flex items-center">
        <div className="relative z-10 py-2">
          <h1 className="page-title text-[30px] sm:text-[34px]">Panel de Control</h1>
          <p className="text-[15px] text-slate-600 mt-1">
            {pending === 0 ? 'Resumen de tu trabajo en un vistazo · sin pendientes para hoy' : `Resumen de tu trabajo en un vistazo · ${pending} pendiente${pending > 1 ? 's' : ''} para hoy`}
          </p>
          <span className="page-title-accent" aria-hidden="true" />
        </div>
        {heroCars.length > 0 && (
          <div
            className="hidden md:flex absolute right-0 inset-y-0 w-[58%] items-end justify-end gap-0 pointer-events-none"
            style={{ WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 30%)', maskImage: 'linear-gradient(to right, transparent 0%, black 30%)' }}
            aria-hidden="true"
          >
            {heroCars.map((v, i) => (
              <img
                key={v.patente}
                src={v.fotoPrincipal || v.fotos?.[0]}
                alt=""
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                className="h-full w-1/3 object-cover"
                style={{ opacity: 0.55 + i * 0.2 }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Buscador (celular: en la PC está arriba) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(q.trim());
        }}
        className="lg:hidden flex items-center gap-2 px-4 h-12 rounded-2xl bg-white border border-slate-200 shadow-[var(--shadow-card)]"
      >
        <Search className="w-5 h-5 text-slate-400" />
        <input
          id="home-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por marca, modelo, patente…"
          className="flex-1 bg-transparent outline-none text-[15px] text-slate-900 placeholder:text-slate-500"
        />
      </form>

      {/* ===== INDICADORES ===== */}
      <section aria-label="Indicadores" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={k.key === 'stock' || k.key === 'reservadas' ? undefined : onGoSales}
            className="autonet-card autonet-card-hover p-5 flex items-center gap-4 text-left min-h-[108px]"
          >
            <span className={`icon-bubble w-14 h-14 ${k.tone}`}>
              <k.icon className="w-7 h-7" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="flex items-start justify-between gap-2">
                <span className="text-[28px] leading-none font-extrabold tracking-[-0.02em] text-slate-900 tabular truncate">{k.value}</span>
                {k.deltaText && <Delta value={k.delta || 0} text={k.deltaText} />}
              </span>
              <span className="block text-[13.5px] font-medium text-slate-600 mt-1.5">{k.label}</span>
              <span className="flex items-end justify-between gap-2 mt-1">
                <span className="text-[11.5px] text-slate-400 truncate">{k.hint}</span>
                {k.series.length > 1 && <Sparkline values={k.series} color={k.line} />}
              </span>
            </span>
          </button>
        ))}
      </section>

      {/* ===== EVOLUCIÓN · ESTADO · ACTIVIDAD ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <section className="xl:col-span-5 autonet-card p-5 flex flex-col gap-4">
          <header className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="flex items-center gap-2 text-[17px] font-bold text-slate-900">
              <BarChart3 className="w-5 h-5 text-blue-600" /> Evolución de mis ventas
            </h2>
            <div className="inline-flex p-1 rounded-xl bg-slate-100" role="tablist" aria-label="Período">
              {(['7d', '30d', '3m', '12m'] as Range[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={range === r}
                  onClick={() => setRange(r)}
                  className={`h-8 px-3 rounded-lg text-[12.5px] font-semibold ${range === r ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </header>
          <LineChart points={evo} total={evoTotal} />
          <div className="mt-auto grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            <MiniStat label="En el período" value={String(evoTotal)} />
            <MiniStat label="Este mes" value={String(soldThis.length)} />
            <MiniStat label="Mes anterior" value={String(soldPrev.length)} />
          </div>
        </section>

        <section className="xl:col-span-3 autonet-card p-5 flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-[17px] font-bold text-slate-900">
            <PieChart className="w-5 h-5 text-slate-700" /> Estado del stock
          </h2>
          <div className="flex items-center gap-4">
            <Donut parts={donut.filter((d) => !d.note)} />
            <ul className="flex-1 min-w-0 space-y-2.5 text-[12.5px]">
              {donut.map((d) => (
                <li key={d.label} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                  {d.note ? (
                    <button type="button" onClick={onShowCriticals} className="flex-1 min-w-0 truncate text-left text-slate-600 hover:text-slate-900 hover:underline">
                      {d.label}
                    </button>
                  ) : (
                    <span className="flex-1 min-w-0 truncate text-slate-600">{d.label}</span>
                  )}
                  <span className="font-bold text-slate-900 tabular">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="xl:col-span-4 autonet-card p-5 flex flex-col gap-3">
          <header className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[17px] font-bold text-slate-900">
              <Clock className="w-5 h-5 text-slate-700" /> Actividad reciente
            </h2>
            <button type="button" onClick={onUpdateStock} className="text-[12.5px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-1">
              Actualizar stock <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </header>
          {activity.length === 0 ? (
            <p className="text-[13px] text-slate-500 py-6 text-center">Todavía no hay movimientos.</p>
          ) : (
            <ul className="space-y-1">
              {activity.map((a, i) => (
                <li key={i}>
                  <button type="button" onClick={a.onClick} disabled={!a.onClick} className="w-full flex items-center gap-3 py-2 text-left rounded-lg enabled:hover:bg-slate-50">
                    <span className={`icon-bubble w-10 h-10 ${a.tone}`}>
                      <a.icon className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13.5px] font-semibold text-slate-900 truncate">{a.title}</span>
                      <span className="block text-[12.5px] text-slate-500 truncate">{a.detail}</span>
                    </span>
                    <span className="text-[12px] text-slate-400 shrink-0 tabular">{when(a.at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ===== PARA HACER HOY · OBJETIVOS ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-8 space-y-4">
          <FollowUpList alerts={alerts} onOpenVehicle={onOpenVehicle} title="Clientes para retomar" />
          {toInvoice.length > 0 && (
            <section className="autonet-card overflow-hidden">
              <header className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-slate-700" />
                <h2 className="text-[15px] font-bold text-slate-900">Ventas sin fecha de facturación</h2>
                <span className="text-[13px] text-slate-500 tabular">{toInvoice.length}</span>
                <span className="ml-auto hidden sm:inline text-[12.5px] text-slate-400">Cambian la comisión del mes</span>
              </header>
              <ul className="divide-y divide-slate-100">
                {toInvoice.slice(0, 6).map((v) => (
                  <li key={v.patente}>
                    <button type="button" onClick={() => onOpenSale(v)} className="w-full px-5 py-3 flex items-center gap-3 text-left text-[13.5px] hover:bg-slate-50">
                      <span className="plate shrink-0">{v.patente}</span>
                      <span className="font-semibold text-slate-900 truncate">
                        {v.marca} {v.modelo}
                      </span>
                      <span className="text-slate-500 text-[12.5px] truncate">{v.clienteNombre || ''}</span>
                      <span className="ml-auto text-[12.5px] font-semibold text-blue-600 shrink-0">Cargar fecha</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        {summary && (
          <section className="xl:col-span-4 autonet-card p-5 flex flex-col gap-3.5">
            <div>
              <h2 className="text-[17px] font-bold text-slate-900">Objetivos de {monthName(now, 'long').toLowerCase()}</h2>
              <p className="text-[12.5px] text-slate-500 mt-0.5">Lo que llevás para el Nivel 1</p>
            </div>
            {goals.map((g) => (
              <div key={g.label} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[13px]">
                  <span className="text-slate-700">{g.label}</span>
                  <span className="font-bold tabular text-slate-900">
                    {g.v} <span className="font-normal text-slate-400">/ {g.meta}</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${g.color}`} style={{ width: `${Math.min(100, Math.max(3, (g.v / g.meta) * 100))}%` }} />
                </div>
              </div>
            ))}
            <div className="mt-1 pt-3 border-t border-slate-100 flex items-baseline justify-between">
              <span className="text-[12.5px] text-slate-500">Comisión estimada</span>
              <span className="text-[20px] font-extrabold tabular text-slate-900">{formatCurrency(summary.totalGrossEstimated)}</span>
            </div>
          </section>
        )}
      </div>

      {/* ===== VEHÍCULOS DESTACADOS ===== */}
      {featured.length > 0 && (
        <section className="space-y-4">
          <header className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-[19px] font-bold text-slate-900">
              <Car className="w-6 h-6 text-slate-800" /> Vehículos destacados
            </h2>
            <button type="button" onClick={onShowCriticals} className="btn btn-secondary btn-sm">
              Ver críticas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {featured.map((v) => (
              <article key={v.patente} className="autonet-card autonet-card-hover overflow-hidden flex flex-col">
                <VehiclePhoto vehicle={v} className="h-40">
                  <span className="absolute top-3 right-3 flex gap-1.5">
                    <StatusBadge vehicle={v} size="md" />
                  </span>
                </VehiclePhoto>
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <div>
                    <h3 className="text-[16px] font-bold text-slate-900 truncate">
                      {v.marca} {v.modelo}
                    </h3>
                    <p className="text-[12.5px] text-slate-500 truncate">
                      {v.version || '—'} · {v.anio}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[12px] text-slate-600 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-slate-400" /> {formatKm(v.kilometraje)}
                    </span>
                    {v.combustible && (
                      <span className="inline-flex items-center gap-1">
                        <Fuel className="w-3.5 h-3.5 text-slate-400" /> {v.combustible}
                      </span>
                    )}
                    {v.caja && (
                      <span className="inline-flex items-center gap-1">
                        <Cog className="w-3.5 h-3.5 text-slate-400" /> {v.caja}
                      </span>
                    )}
                  </div>
                  <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                    <span className="text-[21px] font-extrabold tracking-[-0.02em] text-slate-900 tabular">{formatCurrency(v.precio, v.moneda)}</span>
                    <button
                      type="button"
                      onClick={() => onOpenVehicle(v)}
                      className="h-9 px-3.5 rounded-[10px] border border-blue-500 text-blue-600 text-[13px] font-semibold inline-flex items-center gap-1.5 hover:bg-blue-50"
                    >
                      Ver detalle <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const when = (iso: string) => {
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = ymd(new Date());
  if (ymd(d) === today && iso.length > 10) return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(d).replace('.', '');
};

const MiniStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div className="text-[11.5px] text-slate-500">{label}</div>
    <div className="text-[18px] font-extrabold text-slate-900 tabular">{value}</div>
  </div>
);

const Delta: React.FC<{ value: number; text: string }> = ({ value, text }) => (
  <span className={`inline-flex items-center gap-0.5 text-[12.5px] font-bold shrink-0 ${value > 0 ? 'text-emerald-600' : value < 0 ? 'text-brand-600' : 'text-slate-400'}`}>
    {value > 0 ? <ArrowUp className="w-3.5 h-3.5" /> : value < 0 ? <ArrowDown className="w-3.5 h-3.5" /> : null}
    {text}
  </span>
);

const Sparkline: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
  const w = 84;
  const h = 26;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 2 - ((v - min) / (max - min || 1)) * (h - 4)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="shrink-0">
      <path d={`${d} L${w} ${h} L0 ${h} Z`} fill={color} opacity="0.1" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const LineChart: React.FC<{ points: { label: string; value: number }[]; total: number }> = ({ points, total }) => {
  const W = 560;
  const H = 210;
  const padL = 28;
  const padB = 24;
  const padT = 28;
  const max = Math.max(4, ...points.map((p) => p.value));
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const x = (i: number) => padL + (i / Math.max(1, points.length - 1)) * (W - padL - 10);
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const labelEvery = Math.ceil(points.length / 6);
  const lastI = points.length - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Ventas en el período: ${total}`}>
      <defs>
        <linearGradient id="evoFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3b6cf0" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#3b6cf0" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - 10} y1={y(t * step)} y2={y(t * step)} stroke="var(--color-slate-200)" strokeDasharray={t ? '3 4' : undefined} />
          <text x={padL - 8} y={y(t * step) + 4} textAnchor="end" fontSize="11" fill="var(--color-slate-400)">
            {t * step}
          </text>
        </g>
      ))}
      <path d={`${d} L${x(lastI)} ${y(0)} L${x(0)} ${y(0)} Z`} fill="url(#evoFill)" />
      <path d={d} fill="none" stroke="#1c44b8" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.length <= 13 && points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r="4" fill="#1c44b8" />)}
      <circle cx={x(lastI)} cy={y(points[lastI]?.value || 0)} r="6" fill="white" stroke="#1c44b8" strokeWidth="2.5" />
      <g transform={`translate(${Math.min(x(lastI) - 40, W - 92)}, 2)`}>
        <rect width="82" height="22" rx="6" fill="var(--color-slate-900)" />
        <text x="41" y="15" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="white">
          {total} venta{total === 1 ? '' : 's'}
        </text>
      </g>
      {points.map((p, i) =>
        i % labelEvery === 0 || i === lastI ? (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--color-slate-500)">
            {p.label}
          </text>
        ) : null
      )}
    </svg>
  );
};

const Donut: React.FC<{ parts: { label: string; value: number; color: string }[] }> = ({ parts }) => {
  const total = parts.reduce((a, p) => a + p.value, 0);
  const r = 46;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width="116" height="116" viewBox="0 0 120 120" className="shrink-0" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(', ')}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-slate-100)" strokeWidth="16" />
      {total > 0 &&
        parts.map((p) => {
          const len = (p.value / total) * c;
          const el = (
            <circle
              key={p.label}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth="16"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            />
          );
          offset += len;
          return el;
        })}
      <text x="60" y="60" textAnchor="middle" fontSize="24" fontWeight="800" fill="var(--color-slate-900)">
        {total}
      </text>
      <text x="60" y="77" textAnchor="middle" fontSize="11" fill="var(--color-slate-500)">
        Total
      </text>
    </svg>
  );
};
