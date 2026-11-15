import React from 'react';
import { Vehicle } from '../../types/stock';

/**
 * Foto de la unidad (de la web de Autonet). Si no tiene, o no carga, muestra una silueta de auto
 * sobre un fondo suave para que la grilla no quede con huecos.
 */
export const VehiclePhoto: React.FC<{ vehicle: Vehicle; className?: string; rounded?: string; children?: React.ReactNode }> = ({
  vehicle,
  className = 'h-40',
  rounded = '',
  children,
}) => {
  const src = vehicle.fotoPrincipal || vehicle.fotos?.[0];
  const [failed, setFailed] = React.useState(false);
  const show = Boolean(src) && !failed;
  return (
    <div className={`relative overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 ${rounded} ${className}`}>
      {show ? (
        <img
          src={src}
          alt={`${vehicle.marca} ${vehicle.modelo} ${vehicle.anio}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-end justify-center pb-3">
          <svg viewBox="0 0 320 120" className="w-[62%] max-w-[220px] text-slate-300" role="img" aria-label="Unidad sin foto en la web todavía">
            <path
              d="M20 84 L30 64 Q36 54 52 52 L98 48 L130 27 Q138 22 152 22 L224 22 Q238 22 248 31 L270 50 L294 56 Q306 59 306 70 L306 86 Q306 92 300 92 L20 92 Q14 92 14 86 Z"
              fill="currentColor"
            />
            <path d="M140 31 L154 27 L198 27 L198 48 L114 50 Z" fill="white" opacity="0.7" />
            <path d="M206 27 L222 27 Q232 27 240 35 L254 48 L206 48 Z" fill="white" opacity="0.7" />
            <circle cx="82" cy="92" r="21" fill="#97a1b5" />
            <circle cx="82" cy="92" r="9" fill="#e3e8f0" />
            <circle cx="250" cy="92" r="21" fill="#97a1b5" />
            <circle cx="250" cy="92" r="9" fill="#e3e8f0" />
          </svg>
        </div>
      )}
      {children}
    </div>
  );
};
