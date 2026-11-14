import React from 'react';
import { Vehicle } from '../../types/stock';
import { BoletoRecord } from '../../services/boletoHistoryService';
import { MySalesView } from '../MySalesView';
import { BoletosView } from '../boletos/BoletosView';

/** VENTAS: mis ventas y las de otros (con cliente y facturación) + boletos agrupados por mes. */
export const SalesHubView: React.FC<{
  vehicles: Vehicle[];
  initialTab?: 'ventas' | 'boletos';
  onSelectVehicle: (v: Vehicle) => void;
  onOpenMarkAsSold: (v: Vehicle) => void;
  onNavigateToStock: () => void;
  onReopenBoleto: (rec: BoletoRecord) => void;
  onToast: (t: string, type?: 'success' | 'info' | 'warn') => void;
}> = ({ vehicles, initialTab = 'ventas', onSelectVehicle, onOpenMarkAsSold, onNavigateToStock, onReopenBoleto, onToast }) => {
  const [tab, setTab] = React.useState<'ventas' | 'boletos'>(initialTab);
  React.useEffect(() => setTab(initialTab), [initialTab]);
  return (
    <div className="space-y-4">
      <div className="inline-flex p-1 rounded-xl bg-slate-100 text-[13.5px] font-semibold" role="tablist">
        {(
          [
            ['ventas', 'Ventas'],
            ['boletos', 'Boletos por mes'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-lg ${tab === k ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'ventas' ? (
        <MySalesView vehicles={vehicles} onSelectVehicle={onSelectVehicle} onOpenMarkAsSold={onOpenMarkAsSold} onNavigateToStock={onNavigateToStock} />
      ) : (
        <BoletosView onReopen={onReopenBoleto} onToast={onToast} />
      )}
    </div>
  );
};
