import React from 'react';
import { Vehicle } from '../../types/stock';
import { getSituacionOperativaInfo } from '../../utils/autonetHelpers';

/**
 * Dónde está la unidad (Ub del PDF). Se lee como una frase:
 * verde = está en Autonet y se puede mostrar hoy; azul = otra sucursal; ámbar = todavía no ingresó.
 */
const UB: Record<string, { text: string; dot: string }> = {
  A: { text: 'En Autonet', dot: '#1f7a4d' },
  S: { text: 'En Solalique', dot: '#2f5fd0' },
  GR: { text: 'En Gral. Roca', dot: '#2f5fd0' },
  P: { text: 'Pendiente de ingreso', dot: '#b26a00' },
  FINAN: { text: 'Financiación', dot: '#8a8d94' },
};

export const UbBadge: React.FC<{ vehicle: Vehicle; className?: string }> = ({ vehicle, className = '' }) => {
  const code = (vehicle.ubCode || vehicle.ubicacion || '').trim().toUpperCase();
  const info = getSituacionOperativaInfo(code);
  const m = UB[code];
  const text = code ? m?.text || `Ub: ${info.shortLabel}` : 'Ub sin informar';
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-900 whitespace-nowrap ${className}`}
      title={`Situación en stock (Ub): ${info.label}${info.description ? ' — ' + info.description : ''}`}
    >
      <span
        className="w-[7px] h-[7px] rounded-full shrink-0"
        style={m || code ? { background: m?.dot || '#8a8d94' } : { border: '1.5px solid #8a8d94' }}
        aria-hidden="true"
      />
      {text}
    </span>
  );
};
