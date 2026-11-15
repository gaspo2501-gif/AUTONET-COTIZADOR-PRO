import React from 'react';
import { Search, X, SlidersHorizontal, LayoutGrid, List, ArrowUpDown, SearchX, RotateCcw, FileUp } from 'lucide-react';
import { CommercialFilter, StockFilters, Vehicle, VehicleStatus } from '../../types/stock';
import { applyStockFilters, countActiveAdvancedFilters, StockCounts } from '../../utils/stockSelectors';
import { sortVehicles, SORT_OPTIONS, StockSortKey, isSortKey } from '../../utils/stockSort';
import { normalizePatent } from '../../utils/vehicleIdentity';
import { getSituacionOperativaInfo } from '../../utils/autonetHelpers';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { VehicleCard } from '../VehicleCard';
import { MobileCompactVehicleCard } from '../MobileCompactVehicleCard';
import { VehicleTable } from '../VehicleTable';
import { EmptyState } from '../ui/EmptyState';
import { FilterPanel } from './FilterPanel';

interface StockViewProps {
  vehicles: Vehicle[];
  filters: StockFilters;
  onFiltersChange: React.Dispatch<React.SetStateAction<StockFilters>>;
  onResetFilters: () => void;
  defaultFilters: StockFilters;
  stockCounts: StockCounts;
  onSelect: (v: Vehicle) => void;
  onQuote: (v: Vehicle) => void;
  onStatusChange: (v: Vehicle | string, s: VehicleStatus) => void;
  onOpenMarkAsSold: (v: Vehicle) => void;
  onSoldByOther?: (v: Vehicle) => void;
  onUpdateStock?: () => void;
  comparePatents?: string[];
  onToggleCompare?: (v: Vehicle) => void;
}

const COMMERCIAL_TABS: { value: CommercialFilter; label: string; count: (c: StockCounts) => number }[] = [
  { value: 'activo', label: 'En stock', count: (c) => c.activo },
  { value: 'Reservado', label: 'Reservadas', count: (c) => c.reservado },
  { value: 'vendidas', label: 'Vendidas', count: (c) => c.misVentas + c.ventasOtros },
  { value: 'todos', label: 'Todas', count: (c) => c.todos },
];

const THIS_YEAR = new Date().getFullYear();
const PRICE_STEPS = [10, 15, 20, 25, 30, 40, 50].map((m) => m * 1_000_000);
const YEAR_STEPS = Array.from({ length: 16 }, (_, i) => THIS_YEAR - i);
const KM_STEPS = [0, 30_000, 60_000, 100_000, 150_000];

const money = (n: number) => `$${n.toLocaleString('es-AR')}`;

function describeActiveFilters(f: StockFilters, defaults: StockFilters): { key: string; label: string; clear: (f: StockFilters) => StockFilters }[] {
  const out: { key: string; label: string; clear: (f: StockFilters) => StockFilters }[] = [];
  if (f.marca) out.push({ key: 'marca', label: f.marca, clear: (x) => ({ ...x, marca: '', modelo: '' }) });
  if (f.modelo) out.push({ key: 'modelo', label: f.modelo, clear: (x) => ({ ...x, modelo: '' }) });
  if (f.anioMin !== '' && f.anioMax !== '') out.push({ key: 'anio', label: `Año ${f.anioMin}–${f.anioMax}`, clear: (x) => ({ ...x, anioMin: '', anioMax: '' }) });
  else if (f.anioMin !== '') out.push({ key: 'anio', label: `Desde ${f.anioMin}`, clear: (x) => ({ ...x, anioMin: '' }) });
  else if (f.anioMax !== '') out.push({ key: 'anio', label: `Hasta ${f.anioMax}`, clear: (x) => ({ ...x, anioMax: '' }) });
  if (f.precioMin !== '' && f.precioMax !== '') out.push({ key: 'precio', label: `${money(f.precioMin)} – ${money(f.precioMax)}`, clear: (x) => ({ ...x, precioMin: '', precioMax: '' }) });
  else if (f.precioMin !== '') out.push({ key: 'precio', label: `Desde ${money(f.precioMin)}`, clear: (x) => ({ ...x, precioMin: '' }) });
  else if (f.precioMax !== '') out.push({ key: 'precio', label: `Hasta ${money(f.precioMax)}`, clear: (x) => ({ ...x, precioMax: '' }) });
  if (f.kmMin !== '') out.push({ key: 'kmMin', label: `Desde ${Number(f.kmMin).toLocaleString('es-AR')} km`, clear: (x) => ({ ...x, kmMin: '' }) });
  if (f.kmMax !== '') out.push({ key: 'kmMax', label: f.kmMax === 0 ? '0 km' : `Hasta ${Number(f.kmMax).toLocaleString('es-AR')} km`, clear: (x) => ({ ...x, kmMax: '' }) });
  if (f.combustible) out.push({ key: 'comb', label: f.combustible, clear: (x) => ({ ...x, combustible: '' }) });
  if (f.caja) out.push({ key: 'caja', label: f.caja, clear: (x) => ({ ...x, caja: '' }) });
  if (f.traccion) out.push({ key: 'trac', label: f.traccion, clear: (x) => ({ ...x, traccion: '' }) });
  if (f.ubicacion) out.push({ key: 'ub', label: `Ub: ${getSituacionOperativaInfo(f.ubicacion).shortLabel}`, clear: (x) => ({ ...x, ubicacion: '' }) });
  if (f.empresa) out.push({ key: 'emp', label: f.empresa, clear: (x) => ({ ...x, empresa: '' }) });
  if (f.fotosAutonet && f.fotosAutonet !== 'todas')
    out.push({ key: 'fotos', label: f.fotosAutonet === 'con_fotos' ? 'Con fotos web' : 'Sin fotos web', clear: (x) => ({ ...x, fotosAutonet: defaults.fotosAutonet }) });
  if (f.criticas) out.push({ key: 'criticas', label: 'Solo críticas', clear: (x) => ({ ...x, criticas: false }) });
  return out;
}

export const StockView: React.FC<StockViewProps> = ({
  vehicles,
  filters,
  onFiltersChange,
  onResetFilters,
  defaultFilters,
  stockCounts,
  onSelect,
  onQuote,
  onStatusChange,
  onOpenMarkAsSold,
  onSoldByOther,
  onUpdateStock,
  comparePatents = [],
  onToggleCompare,
}) => {
  const [sortBy, setSortBy] = usePersistentState<StockSortKey>('autonet_ui_sort_v2', 'disponibles_primero', isSortKey);
  const [viewMode, setViewMode] = usePersistentState<'cards' | 'table'>('autonet_ui_view_v2', 'cards', (v): v is 'cards' | 'table' => v === 'cards' || v === 'table');
  const [showFilters, setShowFilters] = React.useState(false);
  const [limit, setLimit] = React.useState(36);
  const searchRef = React.useRef<HTMLInputElement>(null);

  // Búsqueda: el input responde instantáneo, el filtrado se aplica con un pequeño debounce
  const [searchText, setSearchText] = React.useState(filters.searchQuery);
  const debouncedSearch = useDebouncedValue(searchText, 120);
  React.useEffect(() => {
    if (debouncedSearch !== filters.searchQuery) onFiltersChange((prev) => ({ ...prev, searchQuery: debouncedSearch }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);
  React.useEffect(() => {
    if (filters.searchQuery !== searchText && filters.searchQuery !== debouncedSearch) setSearchText(filters.searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.searchQuery]);

  // Atajo de teclado "/" para enfocar el buscador
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (e.key === '/' && !typing) {
        // En la PC el buscador está en la barra superior
        const g = document.getElementById('global-search') as HTMLInputElement | null;
        const target = g && g.offsetParent ? g : searchRef.current;
        e.preventDefault();
        target?.focus();
        target?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const visibleVehicles = React.useMemo(() => sortVehicles(applyStockFilters(vehicles, filters), sortBy), [vehicles, filters, sortBy]);

  // Vehículos de la vista comercial (sin filtros avanzados) para opciones del panel
  const scopeVehicles = React.useMemo(
    () => applyStockFilters(vehicles, { ...defaultFilters, estadoComercial: filters.estadoComercial }),
    [vehicles, defaultFilters, filters.estadoComercial]
  );

  React.useEffect(() => setLimit(36), [filters, sortBy]);

  // Scroll infinito
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setLimit((l) => l + 36);
      },
      { rootMargin: '600px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visibleVehicles.length, limit, viewMode]);

  const shown = visibleVehicles.slice(0, limit);
  const advancedCount = countActiveAdvancedFilters(filters);
  const activeChips = describeActiveFilters(filters, defaultFilters);
  // Los filtros que ya están a la vista no se repiten como etiqueta
  const otherChips = activeChips.filter(
    (c) =>
      !['ub', 'criticas', 'kmMax'].includes(c.key) &&
      !(c.key === 'precio' && filters.precioMin === '') &&
      !(c.key === 'anio' && filters.anioMax === '')
  );
  const ubOptions = React.useMemo(
    () => [...new Set(scopeVehicles.map((v) => (v.ubCode || v.ubicacion || '').trim().toUpperCase()).filter(Boolean))].sort(),
    [scopeVehicles]
  );
  const commercial = filters.estadoComercial || 'activo';
  const query = filters.searchQuery;
  const hasAnything = advancedCount > 0 || Boolean(query.trim()) || commercial !== 'activo';

  const setCommercial = (value: CommercialFilter) => onFiltersChange((prev) => ({ ...prev, estadoComercial: value }));
  const clearAdvanced = () =>
    onFiltersChange((prev) => ({ ...defaultFilters, searchQuery: prev.searchQuery, estadoComercial: prev.estadoComercial }));
  const resetAll = () => {
    setSearchText('');
    onResetFilters();
  };

  const SortSelect = (
    <label className="relative inline-flex items-center">
      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
      <select
        id="stock-sort-select"
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as StockSortKey)}
        className="field !w-auto !py-2 !pl-8 !pr-8 !text-[12.5px] !font-bold appearance-none bg-[length:12px] bg-[right_0.6rem_center] bg-no-repeat"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        aria-label="Ordenar resultados"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="space-y-4">
      {/* ============ BARRA DE BÚSQUEDA (sticky en celular) ============ */}
      <div className="lg:hidden sticky top-14 z-20 -mx-4 sm:mx-0 px-4 sm:px-0 py-2.5 sm:py-0 bg-canvas/95 backdrop-blur-md sm:bg-transparent sm:backdrop-blur-none border-b border-slate-200/70 sm:border-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-[18px] h-[18px] text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchRef}
              id="stock-search-input"
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchText('');
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder="Patente, marca, modelo, año, color…"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              className="w-full h-11 sm:h-12 pl-11 pr-10 sm:pr-24 rounded-2xl bg-white border border-slate-200 shadow-[var(--shadow-card)] text-[15px] font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-action-600 focus:ring-4 focus:ring-action-600/10 transition [&::-webkit-search-cancel-button]:hidden"
            />
            {searchText ? (
              <button
                type="button"
                onClick={() => {
                  setSearchText('');
                  searchRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Borrar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <span className="hidden sm:inline absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                Presioná <span className="kbd">/</span>
              </span>
            )}
          </div>

        </div>
      </div>

      {/* ============ ESTADO + FILTROS QUE MÁS SE USAN ============ */}
      <div className="flex items-end gap-4">
        <div className="flex max-w-full overflow-x-auto scrollbar-none gap-6 border-b border-slate-200 text-[14px] font-medium flex-1" role="tablist" aria-label="Estado comercial">
          {COMMERCIAL_TABS.map((t) => {
            const active = commercial === t.value || (t.value === 'activo' && !['Reservado', 'vendidas', 'todos'].includes(commercial));
            return (
              <button
                key={t.value}
                id={`tab-comercial-${t.value}`}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCommercial(t.value)}
                className={`pb-3 -mb-px border-b-2 whitespace-nowrap ${active ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                {t.label} <span className="tabular text-slate-400 font-normal">{t.count(stockCounts)}</span>
              </button>
            );
          })}
        </div>
        {onUpdateStock && (
          <button type="button" id="btn-actualizar-pdf" onClick={onUpdateStock} className="hidden sm:inline-flex btn btn-sm btn-secondary mb-2 shrink-0">
            <FileUp className="w-4 h-4" /> Actualizar con PDF
          </button>
        )}
      </div>

      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex flex-nowrap sm:flex-wrap items-center gap-2 overflow-x-auto pb-1 sm:pb-0 [&>*]:shrink-0" aria-label="Filtros principales">
        <MiniSelect
          id="f-precio"
          label="Precio hasta"
          value={filters.precioMax === '' ? '' : String(filters.precioMax)}
          onChange={(v) => onFiltersChange((p) => ({ ...p, precioMax: v === '' ? '' : Number(v) }))}
          options={PRICE_STEPS.map((n) => [String(n), `$${n / 1_000_000}M`])}
        />
        <MiniSelect
          id="f-anio"
          label="Año desde"
          value={filters.anioMin === '' ? '' : String(filters.anioMin)}
          onChange={(v) => onFiltersChange((p) => ({ ...p, anioMin: v === '' ? '' : Number(v) }))}
          options={YEAR_STEPS.map((y) => [String(y), String(y)])}
        />
        <MiniSelect
          id="f-km"
          label="Km hasta"
          value={filters.kmMax === '' ? '' : String(filters.kmMax)}
          onChange={(v) => onFiltersChange((p) => ({ ...p, kmMax: v === '' ? '' : Number(v) }))}
          options={KM_STEPS.map((k) => [String(k), k === 0 ? '0 km' : `${(k / 1000).toLocaleString('es-AR')} mil`])}
        />
        <MiniSelect
          id="f-ub"
          label="Ubicación"
          value={filters.ubicacion || ''}
          onChange={(v) => onFiltersChange((p) => ({ ...p, ubicacion: v }))}
          options={ubOptions.map((u) => [u, getSituacionOperativaInfo(u).shortLabel])}
        />
        <button
          type="button"
          onClick={() => onFiltersChange((p) => ({ ...p, criticas: !p.criticas }))}
          aria-pressed={Boolean(filters.criticas)}
          className={`h-9 px-3 rounded-lg border text-[13px] font-medium bg-white ${filters.criticas ? 'border-slate-900 text-slate-900' : 'border-slate-300 text-slate-600 hover:border-slate-400'}`}
        >
          Críticas
        </button>
        <button
          id="toggle-advanced-filters"
          type="button"
          onClick={() => setShowFilters(true)}
          className="h-9 px-3 rounded-lg border border-dashed bg-transparent border-slate-300 text-slate-600 hover:border-slate-400 text-[13px] font-medium inline-flex items-center gap-1.5"
        >
          <SlidersHorizontal className="w-4 h-4" /> Más filtros
          {otherChips.length > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-slate-900 text-white text-[11px] font-semibold flex items-center justify-center">{otherChips.length}</span>}
        </button>
        {otherChips.map((c) => (
          <button key={c.key} type="button" onClick={() => onFiltersChange((prev) => c.clear(prev))} className="chip shrink-0" data-active="true" title="Quitar filtro">
            {c.label}
            <X className="w-3.5 h-3.5 opacity-60" />
          </button>
        ))}
        {hasAnything && (
          <button id="clear-filters-btn" type="button" onClick={resetAll} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-slate-500 hover:text-slate-900 px-1">
            <RotateCcw className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}
      </div>

      {/* ============ RESUMEN + ORDEN + VISTA ============ */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-[13px] text-slate-600" aria-live="polite">
          <strong className="text-slate-900 tabular text-[15px]">{visibleVehicles.length}</strong>{' '}
          {visibleVehicles.length === 1 ? 'unidad' : 'unidades'}
          {query.trim() && (
            <>
              {' '}
              para <span className="font-bold text-slate-900">“{query.trim()}”</span>
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          {SortSelect}
          <div className="hidden md:flex items-center p-0.5 bg-slate-200/60 rounded-xl">
            <button
              id="view-mode-cards-btn"
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg ${viewMode === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              title="Vista tarjetas"
              aria-pressed={viewMode === 'cards'}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              id="view-mode-table-btn"
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              title="Vista tabla"
              aria-pressed={viewMode === 'table'}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ============ RESULTADOS ============ */}
      {visibleVehicles.length === 0 ? (
        <EmptyState
          icon={<SearchX className="w-6 h-6" />}
          title="No hay unidades con esos criterios"
          description={
            query.trim()
              ? 'Probá con menos palabras, otra forma de escribir el modelo o solo los números de la patente.'
              : 'Quitá algún filtro o volvé al stock activo completo.'
          }
          action={
            <button type="button" onClick={resetAll} className="btn btn-primary">
              <RotateCcw className="w-4 h-4" /> Ver todo el stock activo
            </button>
          }
        />
      ) : (
        <>
          {/* Celular */}
          <div className="md:hidden flex flex-col gap-2.5">
            {shown.map((v) => (
              <MobileCompactVehicleCard key={normalizePatent(v.patente) || v.id} vehicle={v} onSelect={onSelect} onQuote={onQuote} query={query} />
            ))}
          </div>

          {/* Escritorio */}
          <div className="hidden md:block">
            {viewMode === 'cards' ? (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {shown.map((v) => (
                  <VehicleCard
                    key={normalizePatent(v.patente) || v.id}
                    vehicle={v}
                    onSelect={onSelect}
                    onStatusChange={onStatusChange}
                    onQuote={onQuote}
                    onOpenMarkAsSold={onOpenMarkAsSold}
                    onSoldByOther={onSoldByOther}
                    query={query}
                    isComparing={comparePatents.includes(normalizePatent(v.patente))}
                    onToggleCompare={onToggleCompare}
                  />
                ))}
              </div>
            ) : (
              <VehicleTable
                vehicles={shown}
                onSelect={onSelect}
                onStatusChange={onStatusChange}
                onQuote={onQuote}
                onOpenMarkAsSold={onOpenMarkAsSold}
                query={query}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />
            )}
          </div>

          {visibleVehicles.length > limit && (
            <div ref={sentinelRef} className="py-4 text-center">
              <button type="button" onClick={() => setLimit((l) => l + 36)} className="btn btn-secondary">
                Mostrar más ({visibleVehicles.length - limit} restantes)
              </button>
            </div>
          )}
        </>
      )}

      {showFilters && (
        <FilterPanel
          filters={filters}
          onChange={(f) => onFiltersChange(f)}
          onClearAdvanced={clearAdvanced}
          onClose={() => setShowFilters(false)}
          scopeVehicles={scopeVehicles}
          resultCount={visibleVehicles.length}
        />
      )}
    </div>
  );
};

const MiniSelect: React.FC<{ id: string; label: string; value: string; onChange: (v: string) => void; options: [string, string][] }> = ({ id, label, value, onChange, options }) => (
  <label className={`relative h-9 inline-flex items-center rounded-lg border bg-white text-[13px] font-medium ${value !== '' ? 'border-slate-900 text-slate-900' : 'border-slate-300 text-slate-600 hover:border-slate-400'}`}>
    <span className="pl-3 pr-1 whitespace-nowrap">{label}</span>
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-full pr-7 pl-1 bg-transparent outline-none appearance-none cursor-pointer ${value !== '' ? 'font-semibold text-slate-900' : 'text-slate-400'}`}
      style={{ colorScheme: 'light' }}
      aria-label={label}
    >
      <option value="">todos</option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
    <svg className="w-3 h-3 absolute right-2.5 pointer-events-none opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="m6 9 6 6 6-6" />
    </svg>
  </label>
);
