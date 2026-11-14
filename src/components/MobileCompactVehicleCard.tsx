import React from 'react';
import { Vehicle } from '../types/stock';
import { formatCurrency, formatKm } from '../utils/formatters';
import { StatusBadge } from './ui/StatusBadge';
import { Highlight } from './ui/Highlight';
import { UbBadge } from './ui/UbBadge';

interface MobileCompactVehicleCardProps {
  vehicle: Vehicle;
  onSelect: (vehicle: Vehicle) => void;
  /** Se mantiene por compatibilidad: la cotización se abre desde la ventana de la unidad */
  onQuote?: (vehicle: Vehicle) => void;
  query?: string;
}

/** Tarjeta del celular: patente + dónde está, modelo + precio, una línea de datos. Tocarla abre la unidad. */
export const MobileCompactVehicleCard: React.FC<MobileCompactVehicleCardProps> = React.memo(({ vehicle, onSelect, query }) => {
  const sold = vehicle.estado === 'Vendido';
  const priceToConfirm = vehicle.precio === null || vehicle.precio === undefined;
  const showStatus = vehicle.estado !== 'Disponible';

  return (
    <article className="autonet-card overflow-hidden">
      <button type="button" onClick={() => onSelect(vehicle)} className="w-full text-left p-3.5 flex flex-col gap-2 active:bg-slate-50">
        <span className="flex items-center justify-between gap-2">
          <span className="plate">
            <Highlight text={vehicle.patente ? vehicle.patente.toUpperCase().trim() : 'S/D'} query={query} />
          </span>
          {showStatus ? <StatusBadge vehicle={vehicle} size="sm" /> : <UbBadge vehicle={vehicle} className="!text-[12px]" />}
        </span>
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900 line-clamp-1">
            <Highlight text={`${vehicle.marca} ${vehicle.modelo}`} query={query} />
          </span>
          <span className={`font-display tabular shrink-0 font-semibold ${priceToConfirm ? 'text-amber-700 text-[13px]' : sold ? 'text-slate-500 text-[16px]' : 'text-slate-900 text-[16px]'}`}>
            {formatCurrency(vehicle.precio, vehicle.moneda)}
          </span>
        </span>
        <span className="text-[12.5px] text-slate-500 line-clamp-1">
          {[vehicle.anio, formatKm(vehicle.kilometraje), vehicle.combustible, vehicle.caja === 'Automática' ? 'AT' : '', vehicle.version].filter(Boolean).join(' · ')}
        </span>
        {showStatus && <UbBadge vehicle={vehicle} className="!text-[12px]" />}
      </button>
    </article>
  );
});

MobileCompactVehicleCard.displayName = 'MobileCompactVehicleCard';
