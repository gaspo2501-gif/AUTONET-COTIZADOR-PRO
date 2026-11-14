import React from 'react';
import { Vehicle } from '../../types/stock';
import { isHistoricalVehicle, normalizeCommercialStatus } from '../../utils/stockSelectors';
import { isCriticalVehicle } from '../../utils/critical';

type Tone = { label: string; cls: string; dot: string };

export function getVehicleStatusTone(vehicle: Vehicle): Tone {
  if (isHistoricalVehicle(vehicle)) return { label: 'Fuera de stock', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
  const st = normalizeCommercialStatus(vehicle.estado);
  if (st === 'Reservado') return { label: 'Reservada', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' };
  if (st === 'Vendido') {
    if (vehicle.saleOwner === 'self') return { label: 'Vendida por mí', cls: 'bg-slate-900 text-white', dot: 'bg-white' };
    if (vehicle.saleOwner === 'other') return { label: 'Vendida por otro', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
    return { label: 'Vendida', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
  }
  return { label: 'Disponible', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
}

export const CriticalBadge: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'sm' }) => (
  <span
    title="Unidad crítica (resaltada en el PDF de stock o marcada a mano)"
    className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap bg-brand-50 text-brand-600 ${
      size === 'sm' ? 'text-[11.5px] px-2.5 py-0.5' : 'text-[12px] px-2.5 py-1'
    }`}
  >
    Crítica
  </span>
);

export const StatusBadge: React.FC<{ vehicle: Vehicle; size?: 'sm' | 'md' }> = ({ vehicle, size = 'md' }) => {
  const t = getVehicleStatusTone(vehicle);
  const critical = !isHistoricalVehicle(vehicle) && normalizeCommercialStatus(vehicle.estado) !== 'Vendido' && isCriticalVehicle(vehicle);
  const badge = (
    <span
      className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${t.cls} ${
        size === 'sm' ? 'text-[11.5px] px-2.5 py-0.5' : 'text-[12px] px-2.5 py-1'
      }`}
    >
      {t.label}
    </span>
  );
  if (!critical) return badge;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {badge}
      <CriticalBadge size={size} />
    </span>
  );
};
