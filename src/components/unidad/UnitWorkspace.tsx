import React from 'react';
import { X, Check } from 'lucide-react';
import { Vehicle, VehicleStatus, ProvinceTransfer } from '../../types/stock';
import { CommercialBudget, FinancingOption, quoteService } from '../../services/quoteService';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { formatCurrency } from '../../utils/formatters';
import { VehicleDetailModal } from '../VehicleDetailModal';
import { VehicleQuoteModal } from '../VehicleQuoteModal';
import { BudgetModal } from '../BudgetModal';
import { BoletoModal } from '../boleto/BoletoModal';

export type UnitStep = 'ficha' | 'cotizacion' | 'presupuesto' | 'boleto';

const STEPS: { key: UnitStep; label: string }[] = [
  { key: 'ficha', label: 'Ficha' },
  { key: 'cotizacion', label: 'Cotización' },
  { key: 'presupuesto', label: 'Presupuesto' },
  { key: 'boleto', label: 'Boleto' },
];

interface UnitWorkspaceProps {
  vehicle: Vehicle;
  initialStep?: UnitStep;
  onClose: () => void;
  /** El presupuesto visible, para que la app lo pueda imprimir */
  onBudgetChange: (b: CommercialBudget | null) => void;
  onStatusChange: (v: Vehicle | string, s: VehicleStatus) => void;
  onOpenMarkAsSold: (v: Vehicle) => void;
  onUpdateVehicleTableValue: (id: string, value: number, province: ProvinceTransfer) => void;
  allVehicles: Vehicle[];
  onOpenVehicle: (v: Vehicle) => void;
  isComparing?: boolean;
  compareFull?: boolean;
  onToggleCompare?: (v: Vehicle) => void;
  onToast: (t: string, type?: 'success' | 'info' | 'warn') => void;
}

/**
 * VENTANA DE UNIDAD: Ficha → Cotización → Presupuesto → Boleto en un solo lugar.
 * La cotización queda armada al ir y volver entre pasos.
 */
export const UnitWorkspace: React.FC<UnitWorkspaceProps> = ({
  vehicle,
  initialStep = 'ficha',
  onClose,
  onBudgetChange,
  onStatusChange,
  onOpenMarkAsSold,
  onUpdateVehicleTableValue,
  allVehicles,
  onOpenVehicle,
  isComparing,
  compareFull,
  onToggleCompare,
  onToast,
}) => {
  const [step, setStep] = React.useState<UnitStep>(initialStep);
  const [visited, setVisited] = React.useState<Set<UnitStep>>(() => new Set([initialStep]));
  const [budget, setBudget] = React.useState<CommercialBudget | null>(null);
  const [boleto, setBoleto] = React.useState<{ budget: CommercialBudget | null; options: FinancingOption[] } | null>(null);
  useModalBehavior(onClose);

  const go = (s: UnitStep) => {
    setStep(s);
    setVisited((prev) => new Set(prev).add(s));
  };

  React.useEffect(() => onBudgetChange(budget), [budget, onBudgetChange]);
  React.useEffect(() => () => onBudgetChange(null), [onBudgetChange]);

  const enabled = (s: UnitStep) => s === 'ficha' || s === 'cotizacion' || (s === 'presupuesto' && !!budget) || s === 'boleto';
  const doneIdx = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-4 bg-slate-950/75 backdrop-blur-xs print:hidden" role="dialog" aria-modal="true" aria-label={`Unidad ${vehicle.patente}`}>
      <div className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-5xl h-full sm:h-[94vh] flex flex-col overflow-hidden border border-slate-200">
        <header className="shrink-0 border-b border-slate-200">
          <div className="px-4 sm:px-5 pt-3 pb-2 flex items-center gap-3">
            <span className="plate shrink-0">{vehicle.patente}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900 truncate">
                {vehicle.marca} {vehicle.modelo} <span className="font-medium text-slate-500">{vehicle.anio}</span>
              </div>
              <div className="text-[12px] text-slate-500 truncate">
                {vehicle.version || '—'} · <span className="tabular font-semibold text-slate-900">{formatCurrency(vehicle.precio, vehicle.moneda)}</span>
              </div>
            </div>
            <button type="button" id="unit-close" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100" aria-label="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="px-2 sm:px-4 flex gap-1 overflow-x-auto" aria-label="Pasos">
            {STEPS.map((s, i) => {
              const active = s.key === step;
              const can = enabled(s.key);
              const past = i < doneIdx;
              return (
                <button
                  key={s.key}
                  id={`unit-step-${s.key}`}
                  type="button"
                  disabled={!can}
                  onClick={() => go(s.key)}
                  title={!can ? 'Primero generá el presupuesto desde la cotización' : undefined}
                  className={`relative px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap inline-flex items-center gap-1.5 border-b-2 -mb-px ${
                    active ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 enabled:hover:text-slate-800 disabled:opacity-40'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                      active ? 'bg-slate-900 text-white' : past ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {past ? <Check className="w-3 h-3" /> : i + 1}
                  </span>
                  {s.label}
                </button>
              );
            })}
          </nav>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {step === 'ficha' && (
            <VehicleDetailModal
              embedded
              vehicle={vehicle}
              onClose={onClose}
              onStatusChange={onStatusChange}
              onOpenQuote={() => go('cotizacion')}
              onOpenMarkAsSold={onOpenMarkAsSold}
              onUpdateVehicleTableValue={onUpdateVehicleTableValue}
              allVehicles={allVehicles}
              onOpenVehicle={onOpenVehicle}
              isComparing={isComparing}
              compareFull={compareFull}
              onToggleCompare={onToggleCompare}
            />
          )}

          {/* La cotización queda montada para no perder lo cargado */}
          {visited.has('cotizacion') && (
            <div className={step === 'cotizacion' ? 'max-w-2xl mx-auto' : 'hidden'}>
              <VehicleQuoteModal
                embedded
                vehicle={vehicle}
                onClose={onClose}
                onUpdateVehicleTableValue={onUpdateVehicleTableValue}
                onOpenBudget={(b) => {
                  setBudget(b);
                  go('presupuesto');
                }}
                onOpenBoleto={(draft, options) => {
                  setBoleto({ budget: budget || draft, options });
                  go('boleto');
                }}
              />
            </div>
          )}

          {step === 'presupuesto' && budget && (
            <BudgetModal
              embedded
              key={budget.id}
              budget={budget}
              onClose={onClose}
              onOpenBoleto={(b) => {
                setBoleto({ budget: b, options: b.financiacion?.opciones || [] });
                go('boleto');
              }}
              onUpdateClientData={(nombre, telefono) => {
                const saved = quoteService.updateBudgetClient(budget.id, { nombre, telefono });
                setBudget((prev) => (prev ? saved || { ...prev, datosCliente: { nombre, telefono } } : prev));
                onToast('Datos del cliente guardados en el presupuesto.', 'success');
              }}
            />
          )}

          {step === 'boleto' && (
            <BoletoModal
              embedded
              isOpen
              vehicle={vehicle}
              budget={boleto?.budget ?? budget}
              financingAlternatives={boleto?.options ?? budget?.financiacion?.opciones ?? []}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};
