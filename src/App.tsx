import { advisorProfileService } from './services/advisorProfileService';
import { AdvisorSetupModal } from './components/AdvisorSetupModal';
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { Vehicle, StockFilters, VehicleStatus, ProvinceTransfer } from './types/stock';
import { stockService } from './services/stockService';
import { CommercialBudget, quoteService } from './services/quoteService';
import { authService } from './services/authService';
import { SyncStatus } from './services/firestoreService';
import { normalizePatent, isSameVehicle } from './utils/vehicleIdentity';
import { calculateStockCounts, applyStockFilters, validateVisibleVehiclesIntegrity } from './utils/stockSelectors';

import { AppShell, NavTab } from './components/layout/AppShell';
import { StockView } from './components/stock/StockView';
import { Toaster, useToasts } from './components/ui/Toaster';
import { UnitWorkspace, UnitStep } from './components/unidad/UnitWorkspace';
import { BudgetModal } from './components/BudgetModal';
import { QuoteDocument } from './components/QuoteDocument';
import { MarkAsSoldModal } from './components/MarkAsSoldModal';
import { LoginModal } from './components/LoginModal';
import { CompareBar } from './components/consultas/CompareBar';
import { CompareModal } from './components/consultas/CompareModal';
import { BoletoModal } from './components/boleto/BoletoModal';
import { BoletoRecord } from './services/boletoHistoryService';
import { appEvents } from './services/appEvents';
import { usePersistentState } from './hooks/usePersistentState';
import { getBudgetAlerts } from './utils/budgetAlerts';
import { webCatalogService, mergeWebCatalog } from './services/webCatalogService';

// Secciones pesadas: se cargan recién cuando se abren (la app inicia más rápido, sobre todo en el celular)
const HomeView = lazy(() => import('./components/inicio/HomeView').then((m) => ({ default: m.HomeView })));
const SalesHubView = lazy(() => import('./components/ventas/SalesHubView').then((m) => ({ default: m.SalesHubView })));
const SettingsView = lazy(() => import('./components/ajustes/SettingsView').then((m) => ({ default: m.SettingsView })));
const CommissionsView = lazy(() => import('./components/CommissionsView').then((m) => ({ default: m.CommissionsView })));
const UpdateStockView = lazy(() => import('./components/UpdateStockView').then((m) => ({ default: m.UpdateStockView })));
const UpdateHistoryView = lazy(() => import('./components/UpdateHistoryView').then((m) => ({ default: m.UpdateHistoryView })));
const BudgetsView = lazy(() => import('./components/presupuestos/BudgetsView').then((m) => ({ default: m.BudgetsView })));
const StoriesView = lazy(() => import('./components/publicidad/StoriesView').then((m) => ({ default: m.StoriesView })));

const DEFAULT_FILTERS: StockFilters = {
  searchQuery: '',
  marca: '',
  modelo: '',
  anioMin: '',
  anioMax: '',
  kmMin: '',
  kmMax: '',
  precioMin: '',
  precioMax: '',
  combustible: '',
  caja: '',
  traccion: '',
  estado: '',
  estadoComercial: 'activo', // Por defecto muestra únicamente stock activo (Disponible + Reservado)
  ubicacion: '',
  empresa: '',
  fotosAutonet: 'todas',
};

// ---- Navegación por URL (#stock, #ventas…) para que funcione el botón "atrás" del celular ----
const VALID_TABS: NavTab[] = ['inicio', 'stock', 'presupuestos', 'ventas', 'comisiones', 'publicidad', 'ajustes', 'actualizar'];
// Direcciones de la versión anterior que siguen funcionando
const OLD_HASHES: Record<string, NavTab> = { cotizaciones: 'presupuestos', boletos: 'ventas', historial: 'actualizar', configuracion: 'ajustes' };
const tabFromHash = (): NavTab => {
  const h = (typeof window !== 'undefined' ? window.location.hash : '').replace('#', '');
  if (OLD_HASHES[h]) return OLD_HASHES[h];
  return (VALID_TABS as string[]).includes(h) ? (h as NavTab) : 'inicio';
};
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const SectionLoader = () => (
  <div className="space-y-3 py-2" aria-busy="true" aria-label="Cargando sección">
    <div className="skeleton h-8 w-48" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-24" />
      ))}
    </div>
    <div className="skeleton h-64" />
  </div>
);

export default function App() {
  const [rawVehicles, setVehicles] = useState<Vehicle[]>(() => stockService.getAllVehicles());
  // Catálogo de la web de Autonet (fotos y publicaciones actualizadas por GitHub Actions)
  const [webCatalog, setWebCatalog] = useState(() => webCatalogService.get());
  useEffect(() => {
    const unsub = webCatalogService.subscribe(setWebCatalog);
    webCatalogService.refresh();
    const onVisible = () => document.visibilityState === 'visible' && webCatalogService.refresh();
    document.addEventListener('visibilitychange', onVisible);
    const t = setInterval(() => webCatalogService.refresh(), 30 * 60 * 1000);
    return () => {
      unsub();
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(t);
    };
  }, []);
  const vehicles = useMemo(() => mergeWebCatalog(rawVehicles, webCatalog), [rawVehicles, webCatalog]);
  const [currentTab, setCurrentTab] = useState<NavTab>(tabFromHash);
  const [filters, setFilters] = useState<StockFilters>(DEFAULT_FILTERS);
  // Ventana de unidad: Ficha → Cotización → Presupuesto → Boleto
  const [unit, setUnit] = useState<{ vehicle: Vehicle; step: UnitStep } | null>(null);
  const [unitBudget, setUnitBudget] = useState<CommercialBudget | null>(null);
  const [activeBudget, setActiveBudget] = useState<CommercialBudget | null>(null);
  const [soldModalVehicle, setSoldModalVehicle] = useState<Vehicle | null>(null);
  const [salesTab, setSalesTab] = useState<'ventas' | 'boletos'>(() => (window.location.hash === '#boletos' ? 'boletos' : 'ventas'));
  const [salePrefill, setSalePrefill] = useState<Partial<Vehicle> | undefined>(undefined);
  const [boletoReopen, setBoletoReopen] = useState<{ vehicle: Vehicle; data: BoletoRecord['data'] } | null>(null);
  const [comparePatents, setComparePatents] = usePersistentState<string[]>('autonet_compare_v1', [], (v): v is string[] => Array.isArray(v));
  const [compareOpen, setCompareOpen] = useState(false);
  const { toasts, show: showToast, dismiss } = useToasts();

  // Firebase Auth y sincronización
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Perfil del asesor (cada usuario firma con sus datos)
  const [, setProfileTick] = useState(0);
  useEffect(() => advisorProfileService.subscribe(() => setProfileTick((t) => t + 1)), []);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => stockService.getSyncStatus());
  const [showLoginModal, setShowLoginModal] = useState(false);

  // ---------- Navegación ----------
  const navigate = useCallback((tab: NavTab) => {
    setCurrentTab(tab);
    if (window.location.hash !== `#${tab}`) {
      window.history.pushState(null, '', `#${tab}`);
    }
  }, []);

  useEffect(() => {
    const onPop = () => setCurrentTab(tabFromHash());
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, []);

  // Desde un boleto recién generado: abrir "Registrar venta" ya completo
  useEffect(
    () =>
      appEvents.onRegisterSale(({ patente, prefill }) => {
        const v = stockService.getAllVehicles().find((x) => isSameVehicle(x, patente));
        if (!v) return;
        setSalePrefill(prefill);
        setSoldModalVehicle(v);
      }),
    []
  );

  // ---------- Suscripciones ----------
  useEffect(() => {
    const unsubAuth = authService.subscribe((user, isInitializing) => {
      if (isInitializing) return;
      setCurrentUser(user);
    });
    const unsubSync = stockService.subscribeSyncStatus(setSyncStatus);
    return () => {
      unsubAuth();
      unsubSync();
    };
  }, []);

  // Una sola suscripción al stock; los modales abiertos se refrescan con la versión más reciente
  useEffect(() => {
    const refresh = (list: Vehicle[]) => (prev: Vehicle | null) => (prev ? list.find((v) => isSameVehicle(v, prev)) || prev : prev);
    return stockService.subscribe((updatedList) => {
      setVehicles([...updatedList]);
      setUnit((prev) => (prev ? { ...prev, vehicle: refresh(updatedList)(prev.vehicle) as Vehicle } : prev));
      setSoldModalVehicle(refresh(updatedList));
    });
  }, []);

  // ---------- Acciones comerciales ----------
  const openUnit = useCallback((vehicle: Vehicle) => setUnit({ vehicle, step: 'ficha' }), []);
  const handleOpenQuote = useCallback((vehicle: Vehicle) => setUnit({ vehicle, step: 'cotizacion' }), []);
  const handleOpenMarkAsSold = useCallback((vehicle: Vehicle) => setSoldModalVehicle(vehicle), []);

  // Un toque: la vendió otro asesor. Solo se guarda la fecha; se puede deshacer con "Reactivar".
  const handleSoldByOther = useCallback(
    (v: Vehicle) => {
      const updated = stockService.markVehicleAsSold(normalizePatent(v.patente) || v.id, { saleOwner: 'other', soldAt: todayISO() });
      if (updated) showToast(`${updated.patente} marcada como vendida por otro asesor. Si fue un error, buscala en "Vendidas" y tocá Reactivar.`, 'success');
    },
    [showToast]
  );

  const setSearch = useCallback((q: string) => setFilters((p) => ({ ...p, searchQuery: q })), []);
  const showCriticals = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS, criticas: true });
    navigate('stock');
  }, [navigate]);

  const handleConfirmSale = (options: {
    saleOwner: 'self' | 'other';
    soldAt?: string;
    soldPrice?: number;
    observaciones?: string;
    precioRealVenta?: number;
    ivaVenta?: 21 | 10.5;
    comisionBaseCalculada?: number;
    esCritico?: boolean;
    usaCredinet?: boolean;
    tieneTomaUsado?: boolean;
    valorTomaUsado?: number;
    ivaTomaUsado?: 21 | 10.5;
    comisionTomaCalculada?: number;
    marcaModeloTomaUsado?: string;
    patenteTomaUsado?: string;
    fechaFacturacion?: string;
  }) => {
    if (!soldModalVehicle) return;
    const targetIdentifier = normalizePatent(soldModalVehicle.patente) || soldModalVehicle.id;
    const updated = stockService.markVehicleAsSold(targetIdentifier, options);
    if (updated) {
      showToast(
        `${updated.marca} ${updated.modelo} (${updated.patente}) registrada como vendida · ${options.saleOwner === 'self' ? 'venta propia' : 'otro vendedor'}.`,
        'success'
      );
    }
  };

  const handleRevertSale = (vehicleOrPatent: Vehicle | string) => {
    const identifier = typeof vehicleOrPatent === 'string' ? vehicleOrPatent : normalizePatent(vehicleOrPatent.patente) || vehicleOrPatent.id;
    const updated = stockService.revertVehicleToAvailable(identifier);
    if (updated) showToast(`Unidad ${updated.patente} reactivada como DISPONIBLE.`, 'success');
  };

  const handleUpdateVehicleTableValue = (vehicleIdOrPatent: string, tableValue: number, province: ProvinceTransfer) => {
    const updated = stockService.updateVehicle(vehicleIdOrPatent, {
      valorTablaDnrpaEstimado: tableValue,
      provinciaRadicacion: province,
    });
    if (updated) {
      showToast(`Valor de tabla DNRPA ($ ${new Intl.NumberFormat('es-AR').format(tableValue)}) guardado para ${updated.patente}.`, 'success');
    }
  };

  const handleStatusChange = useCallback(
    (vehicleOrIdentifier: Vehicle | string, newStatus: VehicleStatus) => {
      let current: Vehicle | undefined;
      if (typeof vehicleOrIdentifier === 'object') {
        current = vehicleOrIdentifier;
      } else {
        const cleanPat = normalizePatent(vehicleOrIdentifier);
        current = stockService.getAllVehicles().find((v) => (cleanPat ? normalizePatent(v.patente) === cleanPat : v.id === vehicleOrIdentifier));
      }
      if (!current) return;

      if (newStatus === 'Vendido') {
        setSoldModalVehicle(current);
        return;
      }

      const targetKey = normalizePatent(current.patente) || current.id;
      if (newStatus === 'Disponible') {
        const updated = stockService.revertVehicleToAvailable(targetKey);
        if (updated) showToast(`Unidad ${updated.patente} marcada como DISPONIBLE.`, 'success');
        return;
      }

      const updated = stockService.updateVehicleStatus(targetKey, newStatus, true);
      if (updated) showToast(`Unidad ${updated.patente} marcada como RESERVADA.`, 'info');
    },
    [showToast]
  );

  const resetFilters = useCallback(() => setFilters({ ...DEFAULT_FILTERS }), []);

  // ---------- Datos derivados ----------
  const stockCounts = useMemo(() => calculateStockCounts(vehicles), [vehicles]);

  // Validación de seguridad en desarrollo para prevenir regresiones de filtrado
  useEffect(() => {
    if (import.meta.env?.DEV) {
      validateVisibleVehiclesIntegrity(filters.estadoComercial || 'activo', applyStockFilters(vehicles, filters));
    }
  }, [filters, vehicles]);

  const [budgets, setBudgets] = useState(() => quoteService.getBudgetHistory());
  useEffect(() => quoteService.subscribeBudgets(setBudgets), []);
  const budgetAlertCount = useMemo(() => getBudgetAlerts(budgets, vehicles).length, [budgets, vehicles]);

  // Comparación de unidades (hasta 3)
  const compareVehicles = useMemo(
    () => comparePatents.map((p) => vehicles.find((v) => normalizePatent(v.patente) === p)).filter((v): v is Vehicle => !!v),
    [comparePatents, vehicles]
  );
  const toggleCompare = useCallback(
    (v: Vehicle) => {
      const p = normalizePatent(v.patente);
      setComparePatents((prev) => {
        if (prev.includes(p)) return prev.filter((x) => x !== p);
        if (prev.length >= 3) {
          showToast('Podés comparar hasta 3 unidades.', 'warn');
          return prev;
        }
        return [...prev, p];
      });
    },
    [setComparePatents, showToast]
  );

  const reopenBoleto = (rec: BoletoRecord) => {
    const v =
      vehicles.find((x) => isSameVehicle(x, rec.vehiculo.patente)) ||
      ({
        id: rec.vehiculo.patente,
        patente: rec.vehiculo.patente,
        marca: rec.vehiculo.marca,
        modelo: rec.vehiculo.modelo,
        version: rec.vehiculo.version,
        anio: rec.vehiculo.anio,
        empresa: rec.vehiculo.empresa,
        estado: 'Vendido',
      } as Vehicle);
    setBoletoReopen({ vehicle: v, data: rec.data });
  };

  const printBudget = activeBudget || unitBudget;

  return (
    <>
      {/* 1. DOCUMENTO DE IMPRESIÓN (1 hoja A4). Solo visible al imprimir. */}
      <div id="quote-print-root" className="hidden print:block">
        {printBudget && (
          <QuoteDocument
            vehicle={printBudget.vehiculo}
            vehiclePrice={printBudget.precioVehiculo}
            transferValue={printBudget.transferenciaEstimada}
            total={printBudget.totalEstimado}
            financingOptions={printBudget.financiacion?.opciones}
            tradeIn={printBudget.tomaUsado}
            quoteDate={printBudget.fechaEmision}
            validUntil={printBudget.fechaVencimiento}
            clientName={printBudget.datosCliente?.nombre}
            clientPhone={printBudget.datosCliente?.telefono}
            advisor={printBudget.datosAsesor}
          />
        )}
      </div>

      {/* 2. APLICACIÓN INTERACTIVA (oculta al imprimir) */}
      <div id="app-interactive-root" className="min-h-screen print:hidden selection:bg-action-100 selection:text-action-800">
        <AppShell
          currentTab={currentTab}
          onSelectTab={navigate}
          badges={{ inicio: budgetAlertCount || undefined, stock: stockCounts.disponible, ventas: stockCounts.misVentas, presupuestos: budgetAlertCount || undefined }}
          syncStatus={syncStatus}
          user={currentUser}
          onLoginClick={() => setShowLoginModal(true)}
          onLogoutClick={() => {
            authService.signOut();
            showToast('Sesión cerrada. Modo local activado.', 'info');
          }}
          searchValue={filters.searchQuery}
          onSearchChange={setSearch}
        >
          <div key={currentTab} className="anim-fade">
            {currentTab === 'stock' && (
              <StockView
                vehicles={vehicles}
                filters={filters}
                onFiltersChange={setFilters}
                onResetFilters={resetFilters}
                defaultFilters={DEFAULT_FILTERS}
                stockCounts={stockCounts}
                onSelect={openUnit}
                onQuote={handleOpenQuote}
                onStatusChange={handleStatusChange}
                onOpenMarkAsSold={handleOpenMarkAsSold}
                onSoldByOther={handleSoldByOther}
                onUpdateStock={() => navigate('actualizar')}
                comparePatents={comparePatents}
                onToggleCompare={toggleCompare}
              />
            )}

            <Suspense fallback={<SectionLoader />}>
              {currentTab === 'inicio' && (
                <HomeView
                  vehicles={vehicles}
                  budgets={budgets}
                  onSearch={(q) => {
                    setFilters({ ...DEFAULT_FILTERS, searchQuery: q });
                    navigate('stock');
                  }}
                  onOpenVehicle={openUnit}
                  onOpenSale={handleOpenMarkAsSold}
                  onShowCriticals={showCriticals}
                  onUpdateStock={() => navigate('actualizar')}
                  onGoSales={() => {
                    setSalesTab('ventas');
                    navigate('ventas');
                  }}
                />
              )}

              {currentTab === 'ventas' && (
                <SalesHubView
                  vehicles={vehicles}
                  initialTab={salesTab}
                  onSelectVehicle={openUnit}
                  onOpenMarkAsSold={handleOpenMarkAsSold}
                  onNavigateToStock={() => navigate('stock')}
                  onReopenBoleto={reopenBoleto}
                  onToast={showToast}
                />
              )}

              {currentTab === 'comisiones' && (
                <CommissionsView vehicles={vehicles} currentUser={currentUser} onOpenMarkAsSold={handleOpenMarkAsSold} onNavigateToSales={() => navigate('ventas')} />
              )}

              {currentTab === 'presupuestos' && (
                <BudgetsView
                  vehicles={vehicles}
                  onOpenBudget={setActiveBudget}
                  onQuoteVehicle={handleOpenQuote}
                  onNewQuote={() => {
                    navigate('stock');
                    setTimeout(() => document.getElementById('stock-search-input')?.focus(), 50);
                  }}
                  onToast={showToast}
                  onOpenVehicle={openUnit}
                />
              )}

              {currentTab === 'publicidad' && <StoriesView vehicles={vehicles} webCatalog={webCatalog} onToast={showToast} />}

              {currentTab === 'actualizar' && (
                <div className="space-y-8">
                  <UpdateStockView
                    currentStock={vehicles}
                    onUpdateCompleted={(fileName) => {
                      showToast(`Actualización completada desde "${fileName}".`, 'success');
                      navigate('stock');
                    }}
                    onCancel={() => navigate('stock')}
                  />
                  <details className="group">
                    <summary className="cursor-pointer select-none text-[14px] font-bold text-slate-700 hover:text-slate-900">Historial de cargas anteriores</summary>
                    <div className="mt-4">
                      <UpdateHistoryView />
                    </div>
                  </details>
                </div>
              )}

              {currentTab === 'ajustes' && (
                <SettingsView
                  vehicles={vehicles}
                  user={currentUser}
                  syncStatus={syncStatus}
                  onLogin={() => setShowLoginModal(true)}
                  onLogout={() => {
                    authService.signOut();
                    showToast('Sesión cerrada. Modo local activado.', 'info');
                  }}
                  onToast={showToast}
                />
              )}
            </Suspense>
          </div>
        </AppShell>

        <Toaster toasts={toasts} onDismiss={dismiss} />

        {currentTab === 'stock' && !unit && (
          <CompareBar vehicles={compareVehicles} onOpen={() => setCompareOpen(true)} onClear={() => setComparePatents([])} />
        )}
        {compareOpen && compareVehicles.length > 0 && (
          <CompareModal
            vehicles={compareVehicles}
            onClose={() => setCompareOpen(false)}
            onRemove={toggleCompare}
            onClear={() => {
              setComparePatents([]);
              setCompareOpen(false);
            }}
          />
        )}

        {boletoReopen && (
          <BoletoModal isOpen vehicle={boletoReopen.vehicle} initialData={boletoReopen.data} onClose={() => setBoletoReopen(null)} />
        )}

        {unit && (
          <UnitWorkspace
            key={normalizePatent(unit.vehicle.patente) || unit.vehicle.id}
            vehicle={unit.vehicle}
            initialStep={unit.step}
            onClose={() => setUnit(null)}
            onBudgetChange={setUnitBudget}
            onStatusChange={handleStatusChange}
            onOpenMarkAsSold={handleOpenMarkAsSold}
            onUpdateVehicleTableValue={handleUpdateVehicleTableValue}
            allVehicles={vehicles}
            onOpenVehicle={openUnit}
            isComparing={comparePatents.includes(normalizePatent(unit.vehicle.patente))}
            compareFull={comparePatents.length >= 3}
            onToggleCompare={toggleCompare}
            onToast={showToast}
          />
        )}

        {activeBudget && (
          <BudgetModal
            key={activeBudget.id}
            budget={activeBudget}
            onClose={() => setActiveBudget(null)}
            onUpdateClientData={(clientName, clientPhone) => {
              const saved = quoteService.updateBudgetClient(activeBudget.id, { nombre: clientName, telefono: clientPhone });
              setActiveBudget((prev) => (prev ? saved || { ...prev, datosCliente: { nombre: clientName, telefono: clientPhone } } : null));
              showToast('Datos del cliente guardados en el presupuesto.', 'success');
            }}
          />
        )}

        {soldModalVehicle && (
          <MarkAsSoldModal
            key={`${soldModalVehicle.patente}-${salePrefill ? 'boleto' : 'manual'}`}
            vehicle={soldModalVehicle}
            prefill={salePrefill}
            onClose={() => {
              setSoldModalVehicle(null);
              setSalePrefill(undefined);
            }}
            onConfirm={handleConfirmSale}
            onRevert={handleRevertSale}
          />
        )}

        {showLoginModal && (
          <LoginModal
            onSuccess={() => {
              setShowLoginModal(false);
              showToast('Sesión iniciada en la nube.', 'success');
            }}
            onCancel={() => setShowLoginModal(false)}
          />
        )}

        {currentUser && advisorProfileService.needsSetup() && <AdvisorSetupModal email={currentUser.email} />}
      </div>
    </>
  );
}
