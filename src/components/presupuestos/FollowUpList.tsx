import React from 'react';
import { MessageCircle, Check } from 'lucide-react';
import { quoteService } from '../../services/quoteService';
import { BudgetAlert, todayISO } from '../../utils/budgetAlerts';
import { Vehicle } from '../../types/stock';
import { formatCurrency } from '../../utils/formatters';

const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * "Para hacer hoy": presupuestos para retomar (avisos automáticos a los 2 y 7 días o recordatorio manual),
 * bajas de precio y unidades que se vendieron. Se usa en Presupuestos y en Inicio.
 */
export const FollowUpList: React.FC<{ alerts: BudgetAlert[]; onOpenVehicle?: (v: Vehicle) => void; title?: string }> = ({ alerts, onOpenVehicle, title }) => {
  if (alerts.length === 0) return null;
  return (
      
        <section className="autonet-card overflow-hidden">
          <header className="px-4 sm:px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-slate-900">{title || 'Para hacer hoy'}</h2>
            <span className="text-[13px] text-slate-500 tabular">{alerts.length}</span>
            <span className="ml-auto hidden sm:inline text-[12.5px] text-slate-500">Se marcan solas al tocar WhatsApp</span>
          </header>
          <ul className="divide-y divide-slate-100">
            {alerts.map((a, i) => {
              const b = a.budget;
              const who = b.datosCliente?.nombre || 'cliente sin nombre';
              const unit = `${b.vehiculo.marca} ${b.vehiculo.modelo}`;
              const msg =
                a.kind === 'priceDrop'
                  ? `¡Hola${b.datosCliente?.nombre ? ' ' + b.datosCliente.nombre.split(' ')[0] : ''}! Te cuento que el *${unit} ${b.vehiculo.anio}* que estuviste viendo bajó de precio: ahora está *${formatCurrency(a.vehicle.precio)}* (antes ${formatCurrency(b.precioVehiculo)}). ¿Lo querés venir a ver?`
                  : a.kind === 'sold'
                  ? `¡Hola${b.datosCliente?.nombre ? ' ' + b.datosCliente.nombre.split(' ')[0] : ''}! El *${unit}* que habíamos presupuestado ya se vendió, pero tengo otras opciones parecidas que te pueden interesar. ¿Te paso?`
                  : `¡Hola${b.datosCliente?.nombre ? ' ' + b.datosCliente.nombre.split(' ')[0] : ''}! ¿Pudiste pensar lo del *${unit} ${b.vehiculo.anio}*? Si querés lo vemos juntos o te ayudo con la toma de tu usado.`;
              const wa = quoteService.buildWhatsAppLink(b.datosCliente?.telefono, msg) || `https://wa.me/?text=${encodeURIComponent(msg)}`;
              return (
                <li key={`${a.kind}-${b.id}-${i}`} className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                        a.kind === 'priceDrop' ? 'bg-emerald-600' : a.kind === 'sold' ? 'bg-slate-400' : a.kind === 'due' && a.auto && a.auto > 1 ? 'bg-brand-600' : 'bg-amber-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium text-slate-900">
                        {a.kind === 'priceDrop' && <>Bajó {formatCurrency(a.diff)} el {unit} de {who}</>}
                        {a.kind === 'sold' && <>Se vendió el {unit} que le presupuestaste a {who}</>}
                        {a.kind === 'due' &&
                          (a.auto ? (
                            <>
                              Retomar a {who}: {a.auto === 1 ? 'sin respuesta hace 2 días' : 'segundo seguimiento (7 días)'}
                            </>
                          ) : (
                            <>Volver a escribirle a {who}{a.overdueDays > 0 ? ` (hace ${a.overdueDays} día${a.overdueDays > 1 ? 's' : ''})` : ''}</>
                          ))}
                      </div>
                      <div className="text-[12.5px] text-slate-500 truncate mt-0.5">
                        {b.numeroPresupuesto} · {unit} {b.vehiculo.version} · presupuestado {formatCurrency(b.precioVehiculo)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:shrink-0 pl-5 sm:pl-0">
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => a.kind === 'due' && quoteService.markFollowUpDone(b, todayISO())}
                      className="btn btn-sm btn-primary"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                    {a.kind === 'sold' && onOpenVehicle && (
                      <button type="button" onClick={() => onOpenVehicle(a.vehicle)} className="btn btn-sm btn-secondary" title="Ver unidades parecidas para ofrecer">
                        Ver parecidas
                      </button>
                    )}
                    {a.kind === 'due' && (
                      <button
                        type="button"
                        onClick={() => quoteService.updateBudgetFollowUp(b.id, { ...(b.seguimiento || { estado: 'enviado' }), recordarEl: addDays(3) })}
                        className="btn btn-sm btn-ghost"
                        title="Posponer 3 días"
                      >
                        +3 días
                      </button>
                    )}
                    {a.kind !== 'due' && (
                      <button
                        type="button"
                        onClick={() => quoteService.updateBudgetFollowUp(b.id, { ...(b.seguimiento || { estado: 'enviado' }), estado: 'respondio' })}
                        className="btn btn-sm btn-ghost"
                        title="Ya le escribí: marcar como respondió"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
  );
};
