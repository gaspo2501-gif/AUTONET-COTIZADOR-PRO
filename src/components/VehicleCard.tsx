import React from 'react';
import { ChevronDown, GitCompare, ExternalLink, Gauge, Fuel, Cog } from 'lucide-react';
import { VehiclePhoto } from './ui/VehiclePhoto';
import { Vehicle } from '../types/stock';
import { formatCurrency, formatKm } from '../utils/formatters';
import { UbBadge } from './ui/UbBadge';
import { StatusBadge } from './ui/StatusBadge';
import { Highlight } from './ui/Highlight';
import { isHistoricalVehicle } from '../utils/stockSelectors';

interface VehicleCardProps {
  vehicle: Vehicle;
  onSelect: (vehicle: Vehicle) => void;
  onStatusChange: (vehicleOrPatent: Vehicle | string, newStatus: 'Disponible' | 'Reservado' | 'Vendido') => void;
  onQuote?: (vehicle: Vehicle) => void;
  onOpenMarkAsSold?: (vehicle: Vehicle) => void;
  /** Un toque: la vendió otro asesor (solo guarda la fecha) */
  onSoldByOther?: (vehicle: Vehicle) => void;
  query?: string;
  isComparing?: boolean;
  onToggleCompare?: (vehicle: Vehicle) => void;
}

type MenuItem = { key: string; label: string; dot: string; run: () => void };

/**
 * TARJETA PRO. Orden de lectura: qué auto es → cuánto vale → si está para mostrar (Ub).
 * Tres botones parejos: Ficha · Cotizar · Estado (Reservar / Vendida por otro / Liberar…).
 */
export const VehicleCard: React.FC<VehicleCardProps> = React.memo(
  ({ vehicle, onSelect, onStatusChange, onQuote, onOpenMarkAsSold, onSoldByOther, query, isComparing, onToggleCompare }) => {
    const [menuOpen, setMenuOpen] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const sold = vehicle.estado === 'Vendido';
    const historical = isHistoricalVehicle(vehicle);
    const hasValidAutonetUrl = Boolean(vehicle.urlAutonetOriginal && vehicle.urlAutonetOriginal.startsWith('http'));
    const priceToConfirm = vehicle.precio === null || vehicle.precio === undefined;

    React.useEffect(() => {
      if (!menuOpen) return;
      const close = (e: MouseEvent | KeyboardEvent) => {
        if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
      };
      document.addEventListener('mousedown', close);
      document.addEventListener('keydown', close);
      return () => {
        document.removeEventListener('mousedown', close);
        document.removeEventListener('keydown', close);
      };
    }, [menuOpen]);

    const items: MenuItem[] = [];
    if (historical) {
      items.push({ key: 'reactivar', label: 'Volver a poner en stock', dot: '#1f7a4d', run: () => onStatusChange(vehicle, 'Disponible') });
    } else if (vehicle.estado === 'Disponible') {
      items.push({ key: 'reservar', label: 'Reservar', dot: '#b26a00', run: () => onStatusChange(vehicle, 'Reservado') });
      items.push({
        key: 'otro',
        label: onSoldByOther ? 'Vendida por otro' : 'Marcar vendida',
        dot: '#8a8d94',
        run: () => (onSoldByOther ? onSoldByOther(vehicle) : onOpenMarkAsSold ? onOpenMarkAsSold(vehicle) : onStatusChange(vehicle, 'Vendido')),
      });
    } else if (vehicle.estado === 'Reservado') {
      items.push({ key: 'liberar', label: 'Liberar reserva', dot: '#1f7a4d', run: () => onStatusChange(vehicle, 'Disponible') });
      if (onSoldByOther) items.push({ key: 'otro', label: 'Vendida por otro', dot: '#8a8d94', run: () => onSoldByOther(vehicle) });
    } else if (sold) {
      if (onOpenMarkAsSold) items.push({ key: 'venta', label: 'Datos de la venta', dot: '#15171c', run: () => onOpenMarkAsSold(vehicle) });
      items.push({ key: 'reactivar', label: 'Reactivar (fue un error)', dot: '#1f7a4d', run: () => onStatusChange(vehicle, 'Disponible') });
    }

    return (
      <article className={`group autonet-card autonet-card-hover flex flex-col relative ${sold || historical ? 'opacity-90' : ''}`}>
        {/* Foto + patente + estado */}
        <VehiclePhoto vehicle={vehicle} className="h-44" rounded="rounded-t-[var(--radius-card)]">
          <button type="button" onClick={() => onSelect(vehicle)} className="absolute inset-0" aria-label={`Abrir ficha de ${vehicle.marca} ${vehicle.modelo}`} />
          <span className="absolute top-3 left-3 plate on-photo shadow-sm pointer-events-none">
            <Highlight text={vehicle.patente} query={query} />
          </span>
          <span className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-none">
            <StatusBadge vehicle={vehicle} size="md" />
          </span>
          {onToggleCompare && (
            <button
              type="button"
              onClick={() => onToggleCompare(vehicle)}
              className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-colors ${
                isComparing ? 'bg-slate-900 text-white' : 'on-photo text-slate-500 hover:text-slate-900'
              }`}
              title={isComparing ? 'Quitar de la comparación' : 'Sumar a la comparación'}
              aria-label={isComparing ? 'Quitar de la comparación' : 'Sumar a la comparación'}
              aria-pressed={!!isComparing}
            >
              <GitCompare className="w-4 h-4" />
            </button>
          )}
        </VehiclePhoto>

        {/* Qué auto es */}
        <button type="button" onClick={() => onSelect(vehicle)} className="px-[18px] pt-4 text-left">
          <h3 className="text-[16.5px] font-bold tracking-[-0.01em] text-slate-900 leading-snug line-clamp-1">
            <Highlight text={`${vehicle.marca} ${vehicle.modelo}`} query={query} />
          </h3>
          <p className="text-[12.5px] text-slate-500 line-clamp-1 mt-0.5">
            <Highlight text={`${vehicle.version || '—'} · ${vehicle.anio}`} query={query} />
          </p>
        </button>

        {/* Datos técnicos */}
        <div className="px-[18px] pt-2.5 flex items-center gap-x-3.5 gap-y-1 flex-wrap text-[12.5px] text-slate-600">
          <span className="inline-flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-slate-400" /> {formatKm(vehicle.kilometraje)}
          </span>
          {vehicle.combustible && (
            <span className="inline-flex items-center gap-1">
              <Fuel className="w-3.5 h-3.5 text-slate-400" /> {vehicle.combustible}
            </span>
          )}
          {vehicle.caja && (
            <span className="inline-flex items-center gap-1">
              <Cog className="w-3.5 h-3.5 text-slate-400" /> {vehicle.caja}
            </span>
          )}
          {(vehicle.traccion === '4x4' || vehicle.traccion === 'AWD') && <span className="font-semibold text-slate-700">{vehicle.traccion}</span>}
        </div>

        {/* Cuánto vale */}
        <div
          className={`px-[18px] pt-3 tabular font-extrabold tracking-[-0.02em] leading-tight ${
            priceToConfirm ? 'text-amber-700 text-[15px]' : sold ? 'text-slate-500 text-[23px]' : 'text-slate-900 text-[23px]'
          }`}
        >
          {formatCurrency(vehicle.precio, vehicle.moneda)}
        </div>

        <div className="flex-1" />

        {/* Si está para mostrar */}
        <div className="mx-[18px] mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <UbBadge vehicle={vehicle} />
          <span className="flex items-center gap-2 min-w-0">
            {vehicle.empresa && <span className="text-[11.5px] text-slate-500 truncate capitalize">{vehicle.empresa.toLowerCase()}</span>}
            {hasValidAutonetUrl && (
              <a
                href={vehicle.urlAutonetOriginal}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[11.5px] font-semibold text-blue-600 hover:underline"
                title="Ver publicación en autonet.com.ar"
              >
                Web <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </span>
        </div>

        {/* Ficha · Cotizar · Estado */}
        <div className="px-[18px] pt-3.5 pb-[18px] grid grid-cols-3 gap-2">
          <button id={`ver-vehiculo-${vehicle.id}`} type="button" onClick={() => onSelect(vehicle)} className="btn btn-secondary !px-2 h-9">
            Ficha
          </button>
          {onQuote && !sold && !historical ? (
            <button id={`cotizar-vehiculo-${vehicle.id}`} type="button" onClick={() => onQuote(vehicle)} title="Cotización y transferencia DNRPA" className="btn btn-primary !px-2 h-9">
              Cotizar
            </button>
          ) : (
            <span />
          )}
          <div className="relative" ref={menuRef}>
            <button
              id={`estado-vehiculo-${vehicle.id}`}
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              className={`btn btn-secondary !px-2 h-9 w-full ${menuOpen ? '!border-slate-900 !bg-slate-100' : ''}`}
            >
              Estado <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 bottom-[calc(100%+6px)] w-[220px] bg-white border border-slate-300 rounded-[10px] p-1.5 z-20 shadow-[0_8px_24px_rgba(21,23,28,0.10)]">
                {items.map((it) => (
                  <button
                    key={it.key}
                    id={`estado-${it.key}-${vehicle.id}`}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      it.run();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-md text-[13px] font-medium text-slate-900 hover:bg-slate-100 flex items-center gap-2"
                  >
                    <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: it.dot }} />
                    {it.label}
                  </button>
                ))}
                {vehicle.estado === 'Disponible' && (
                  <p className="mx-2.5 mt-1 pt-2 pb-1 border-t border-slate-100 text-[11.5px] leading-snug text-slate-500">Tus ventas se registran solas con el boleto.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </article>
    );
  }
);

VehicleCard.displayName = 'VehicleCard';
