import React, { useState } from 'react';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { 
  X, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Calculator, 
  Calendar, 
  Gauge, 
  Fuel, 
  Tag,
  Building2,
  Share2,
  Check
} from 'lucide-react';
import { Vehicle, VehicleStatus, ProvinceTransfer } from '../types/stock';
import { formatCurrency, formatKm } from '../utils/formatters';
import { getSituacionOperativaInfo, getEmpresaBadgeClass } from '../utils/autonetHelpers';
import { quoteService } from '../services/quoteService';
import { stockService } from '../services/stockService';
import { isCriticalVehicle } from '../utils/critical';
import { normalizePatent } from '../utils/vehicleIdentity';
import { VehicleQuoteModal } from './VehicleQuoteModal';
import { UbBadge } from './ui/UbBadge';
import { VehicleQuickPanel } from './consultas/VehicleQuickPanel';

interface VehicleDetailModalProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  onStatusChange: (vehicleOrPatent: Vehicle | string, newStatus: VehicleStatus) => void;
  onOpenQuote?: (vehicle: Vehicle) => void;
  onOpenMarkAsSold?: (vehicle: Vehicle) => void;
  onUpdateVehicleTableValue?: (vehicleIdOrPatent: string, tableValue: number, province: ProvinceTransfer) => void;
  allVehicles?: Vehicle[];
  onOpenVehicle?: (vehicle: Vehicle) => void;
  isComparing?: boolean;
  compareFull?: boolean;
  onToggleCompare?: (vehicle: Vehicle) => void;
  /** Dentro de la ventana de unidad (sin fondo oscuro ni cabecera propia) */
  embedded?: boolean;
}

export const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({
  vehicle,
  onClose,
  onStatusChange,
  onOpenQuote,
  onOpenMarkAsSold,
  onUpdateVehicleTableValue,
  allVehicles,
  onOpenVehicle,
  isComparing,
  compareFull,
  onToggleCompare,
  embedded = false,
}) => {
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Escape para cerrar + bloqueo del scroll de fondo
  useModalBehavior(embedded || isQuoteModalOpen ? undefined : onClose);

  if (!vehicle) return null;

  const hasValidAutonetUrl = Boolean(
    vehicle.urlAutonetOriginal && vehicle.urlAutonetOriginal.startsWith('http')
  );

  const ubInfo = getSituacionOperativaInfo(vehicle.ubCode || vehicle.ubicacion);

  const handleCopyShare = () => {
    const text = quoteService.formatVehicleShareMessage(vehicle);
    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const handleOpenQuoteModal = () => {
    if (onOpenQuote) {
      onOpenQuote(vehicle);
    } else {
      setIsQuoteModalOpen(true);
    }
  };

  return (
    <>
      <div className={embedded ? 'h-full min-h-0 flex flex-col' : 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto'}>
        <div className={embedded ? 'bg-white w-full flex-1 min-h-0 flex flex-col overflow-hidden [&>*:first-child]:hidden' : 'bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150'}>
          
          {/* Cabecera Modal */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-md bg-slate-900 text-white tabular text-sm font-bold shadow-xs">
                {vehicle.patente}
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  {vehicle.marca} {vehicle.modelo}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {vehicle.version} • {vehicle.anio} • ID: {vehicle.id}
                </p>
              </div>
            </div>

            <button
              id="close-vehicle-modal-btn"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cuerpo del Modal scrollable (Sin fotos, limpio y ordenado) */}
          <div className="p-6 overflow-y-auto space-y-6">
            
            {/* Banner de Estado y Precio */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200">
              <div>
                <span className="text-[12.5px] text-slate-500 block mb-1">
                  Precio de venta
                </span>
                <span className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] tabular text-slate-900">
                  {formatCurrency(vehicle.precio, vehicle.moneda)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <UbBadge vehicle={vehicle} className="mr-2" />
                {vehicle.estado === 'Disponible' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-emerald-50 text-emerald-700">
                    Disponible
                  </span>
                )}
                {vehicle.estado === 'Reservado' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-amber-50 text-amber-700">
                    Reservada
                  </span>
                )}
                {vehicle.estado === 'Vendido' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-slate-100 text-slate-700">
                    Vendida {vehicle.estadoModificadoManualmente ? '(Manual)' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Grilla de Datos Técnicos y Administrativos */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-800">
                Ficha Técnica y Ubicación en Stock
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-white">
                
                {/* Columna 1 */}
                <div className="p-4 space-y-3">
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Marca:</span>
                    <span className="font-bold text-slate-900 text-sm">{vehicle.marca}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Modelo:</span>
                    <span className="font-bold text-slate-900 text-sm">{vehicle.modelo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Versión:</span>
                    <span className="font-semibold text-slate-800">{vehicle.version || 'Estándar'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Año de fabricación:</span>
                    <span className="font-bold text-slate-800">{vehicle.anio}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Patente / Dominio:</span>
                    <span className="font-mono font-black text-slate-900 text-sm">{vehicle.patente}</span>
                  </div>
                </div>

                {/* Columna 2 */}
                <div className="p-4 space-y-3">
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Kilometraje:</span>
                    <span className="font-bold text-slate-900 text-sm">{formatKm(vehicle.kilometraje)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Color:</span>
                    <span className="font-semibold text-slate-800">{vehicle.color || 'A confirmar'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Combustible:</span>
                    <span className="font-semibold text-slate-800">{vehicle.combustible || 'Nafta'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Transmisión:</span>
                    <span className="font-semibold text-slate-800">{vehicle.caja || 'Manual'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Tipo:</span>
                    <span className="font-semibold text-slate-800">{vehicle.tipoVehiculo || vehicle.traccion || 'Estándar'}</span>
                  </div>
                </div>

                {/* Columna 3 */}
                <div className="p-4 space-y-3">
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Empresa / Procedencia:</span>
                    <span className="font-bold text-slate-900">{vehicle.empresa || 'Autonet'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Situación en stock (Ub):</span>
                    <div className="mt-1">
                      <UbBadge vehicle={vehicle} />
                      <span className="block text-[11.5px] text-slate-500 mt-0.5">{ubInfo.label}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Fecha de toma:</span>
                    <span className="tabular text-slate-700">{vehicle.fechaToma || 'No registrada'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Publicación en Autonet:</span>
                    {hasValidAutonetUrl ? (
                      <a
                        href={vehicle.urlAutonetOriginal}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 mt-0.5"
                      >
                        <span className="truncate max-w-[180px]">{vehicle.urlAutonetOriginal}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Sin publicación web activa</span>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Unidad crítica: PDF de stock + marca manual */}
            <CriticalControl vehicle={vehicle} />

            {/* Información comercial de Venta si está Vendido o Fuera de Stock */}
            {(vehicle.estado === 'Vendido' || vehicle.isHistorical) && (
              <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Registro Comercial de la Unidad
                  </span>
                  {onOpenMarkAsSold && (
                    <button
                      type="button"
                      onClick={() => onOpenMarkAsSold(vehicle)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 text-white font-bold text-[11px] transition-colors shadow-xs"
                    >
                      Editar Registro de Venta
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Clasificación:</span>
                    <strong className="text-slate-800">
                      {vehicle.saleOwner === 'self'
                        ? 'Vendida por mí'
                        : vehicle.saleOwner === 'other'
                        ? 'Venta de otro asesor'
                        : vehicle.isHistorical
                        ? 'Fuera de stock'
                        : 'Vendido'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Fecha de venta:</span>
                    <strong className="text-slate-800">{vehicle.soldAt ? vehicle.soldAt.slice(0, 10) : (vehicle.fechaSalidaStock?.slice(0, 10) || 'No registrada')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Precio de venta:</span>
                    <strong className="text-emerald-700 tabular font-bold">
                      {formatCurrency(vehicle.soldPrice || vehicle.precio)}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-800 block mb-1">
                Observaciones
              </span>
              <p className="text-slate-600 leading-relaxed">
                {vehicle.observaciones || 'Sin observaciones registradas para esta unidad.'}
              </p>
            </div>

            {allVehicles && (
              <VehicleQuickPanel
                vehicle={vehicle}
                allVehicles={allVehicles}
                onOpenVehicle={onOpenVehicle}
                isComparing={isComparing}
                compareFull={compareFull}
                onToggleCompare={onToggleCompare}
                showMessages={!embedded}
              />
            )}

          </div>

          {/* Footer con Acciones Requeridas:
              "VER EN AUTONET"
              "COTIZAR"
              "Marcar como vendida"
              "Marcar como reservada"
              "Marcar como disponible"
          */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            
            {/* Botones de negocio principales */}
            <div className="flex flex-wrap items-center gap-2">
              {/* VER EN AUTONET (solo si existe URL válida) */}
              {hasValidAutonetUrl && (
                <a
                  href={vehicle.urlAutonetOriginal}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="modal-btn-ver-autonet"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition-colors shadow-xs"
                >
                  <span>Ver en Autonet</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {/* COTIZAR */}
              <button
                type="button"
                id="modal-btn-cotizar"
                onClick={handleOpenQuoteModal}
                className="btn btn-primary"
              >
                <Calculator className="w-4 h-4" />
                <span>Cotizar</span>
              </button>

              {/* Copiar Ficha para WhatsApp */}
              <button
                type="button"
                onClick={handleCopyShare}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
                title="Copiar ficha del vehículo para enviar por WhatsApp"
              >
                {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedShare ? '¡Copiado!' : 'Compartir'}</span>
              </button>

              {embedded && onToggleCompare && (
                <button
                  type="button"
                  onClick={() => onToggleCompare(vehicle)}
                  disabled={!isComparing && compareFull}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${isComparing ? 'bg-action-50 text-action-700 border-action-200' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
                  title={compareFull && !isComparing ? 'Ya elegiste 3 unidades para comparar' : 'Sumar a la comparación'}
                >
                  {isComparing ? 'En comparación' : 'Comparar'}
                </button>
              )}
            </div>

            {/* Botones de gestión de Estado */}
            <div className="flex flex-wrap items-center gap-1.5">
              {vehicle.estado !== 'Disponible' && (
                <button
                  type="button"
                  id="modal-btn-marcar-disponible"
                  onClick={() => onStatusChange(vehicle, 'Disponible')}
                  className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors"
                >
                  Marcar como disponible
                </button>
              )}

              {!embedded && vehicle.estado !== 'Reservado' && (
                <button
                  type="button"
                  id="modal-btn-marcar-reservado"
                  onClick={() => onStatusChange(vehicle, 'Reservado')}
                  className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-bold transition-colors"
                >
                  Marcar como reservada
                </button>
              )}

              {vehicle.estado !== 'Vendido' ? (
                !embedded && (
                <button
                  type="button"
                  id="modal-btn-marcar-vendido"
                  onClick={() => onOpenMarkAsSold ? onOpenMarkAsSold(vehicle) : onStatusChange(vehicle, 'Vendido')}
                  className="px-3 py-2 rounded-xl bg-brand-50 border border-brand-300 text-brand-800 hover:bg-brand-100 text-xs font-bold transition-colors"
                >
                  Marcar como vendida
                </button>
                )
              ) : (
                onOpenMarkAsSold && (
                  <button
                    type="button"
                    id="modal-btn-editar-venta"
                    onClick={() => onOpenMarkAsSold(vehicle)}
                    className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-300 text-blue-800 hover:bg-blue-100 text-xs font-bold transition-colors"
                  >
                    Datos de la venta
                  </button>
                )
              )}

              <button
                type="button"
                onClick={onClose}
                hidden={embedded}
                className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors ml-1"
              >
                Cerrar
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Modal de Cotización si fue abierto directamente */}
      {isQuoteModalOpen && (
        <VehicleQuoteModal
          vehicle={vehicle}
          onClose={() => setIsQuoteModalOpen(false)}
          onUpdateVehicleTableValue={onUpdateVehicleTableValue}
        />
      )}
    </>
  );
};


/** Marca de unidad crítica: la del PDF de stock y, si hace falta, una manual que tiene prioridad. */
const CriticalControl: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => {
  const critical = isCriticalVehicle(vehicle);
  const manual = typeof vehicle.criticoManual === 'boolean';
  const setManual = (value: boolean | null) => {
    const key = normalizePatent(vehicle.patente) || vehicle.id;
    stockService.updateVehicle(key, { criticoManual: value === null ? undefined : value } as Partial<Vehicle>);
  };
  return (
    <div className={`p-3.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-3 ${critical ? 'bg-brand-50 border-brand-200' : 'bg-slate-50 border-slate-200'}`}>
      <div>
        <div className={`font-extrabold ${critical ? 'text-brand-800' : 'text-slate-700'}`}>
          {critical ? '🔥 Unidad crítica' : 'No es unidad crítica'}
        </div>
        <div className="text-slate-500 mt-0.5">
          PDF de stock: <strong>{vehicle.criticoPdf ? 'resaltada (crítica)' : 'sin resaltar'}</strong>
          {manual && <> · marcada a mano como <strong>{vehicle.criticoManual ? 'crítica' : 'no crítica'}</strong></>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {manual ? (
          <button type="button" onClick={() => setManual(null)} className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100">
            Volver a lo que dice el PDF
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setManual(!critical)}
            className={`px-3 py-1.5 rounded-lg font-bold border ${critical ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100' : 'bg-white border-brand-200 text-brand-600 hover:bg-brand-50'}`}
          >
            {critical ? 'Marcar como NO crítica' : 'Marcar como crítica'}
          </button>
        )}
      </div>
    </div>
  );
};
