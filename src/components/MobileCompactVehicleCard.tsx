import React from 'react';
import { Vehicle } from '../types/stock';
import { formatCurrency, formatKm } from '../utils/formatters';
import { StatusBadge } from './ui/StatusBadge';
import { Highlight } from './ui/Highlight';
import { UbBadge } from './ui/UbBadge';
import { VehiclePhoto } from './ui/VehiclePhoto';

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
      <button type="button" onClick={() => onSelect(vehicle)} className="w-full text-left p-2.5 flex gap-3 items-stretch active:bg-slate-50">
        <VehiclePhoto vehicle={vehicle} className="w-[104px] h-[96px] shrink-0" rounded="rounded-xl" />
        <span className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <span className="text-[15px] font-bold tracking-[-0.01em] text-slate-900 line-clamp-1">
            <Highlight text={`${vehicle.marca} ${vehicle.modelo}`} query={query} />
          </span>
          <span className={`tabular font-extrabold leading-tight ${priceToConfirm ? 'text-amber-700 text-[13px]' : sold ? 'text-slate-500 text-[17px]' : 'text-slate-900 text-[17px]'}`}>
            {formatCurrency(vehicle.precio, vehicle.moneda)}
          </span>
          <span className="text-[12px] text-slate-500 line-clamp-1">
            {[vehicle.anio, formatKm(vehicle.kilometraje), vehicle.combustible, vehicle.caja === 'Automática' ? 'AT' : ''].filter(Boolean).join(' · ')}
          </span>
          <span className="flex items-center justify-between gap-2">
            {showStatus ? <StatusBadge vehicle={vehicle} size="sm" /> : <UbBadge vehicle={vehicle} className="!text-[12px]" />}
            <span className="font-mono text-[11px] font-semibold text-slate-400 tracking-wide">
              <Highlight text={vehicle.patente ? vehicle.patente.toUpperCase().trim() : 'S/D'} query={query} />
            </span>
          </span>
        </span>
      </button>
    </article>
  );
});

MobileCompactVehicleCard.displayName = 'MobileCompactVehicleCard';
