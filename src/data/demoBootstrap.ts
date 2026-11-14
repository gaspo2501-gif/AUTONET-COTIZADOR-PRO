/**
 * SOLO PARA LA DEMO (vite build --mode demo). Carga ejemplos para que Inicio muestre algo.
 * No se incluye en la versión real.
 */
import { stockService } from '../services/stockService';
import { quoteService } from '../services/quoteService';
import { getAvailableVehicles } from '../utils/stockSelectors';

const FLAG = 'autonet_demo_seeded_v2';

export function seedDemo() {
  try {
    if (localStorage.getItem(FLAG)) return;
  } catch {
    return;
  }
  const iso = (daysAgo: number) => {
    const d = new Date(Date.now() - daysAgo * 86_400_000);
    return d.toISOString();
  };
  const avail = getAvailableVehicles(stockService.getAllVehicles());
  // Unidades críticas (como si vinieran resaltadas en el PDF)
  avail.slice(10, 17).forEach((v) => stockService.updateVehicle(v.patente, { criticoPdf: true }));
  // Dos ventas propias, una sin fecha de facturación
  const [s1, s2] = avail.slice(30, 32);
  stockService.markVehicleAsSold(s1.patente, { saleOwner: 'self', soldAt: iso(3).slice(0, 10), fechaFacturacion: iso(1).slice(0, 10) });
  stockService.updateVehicle(s1.patente, { clienteNombre: 'Lucía Fernández' });
  stockService.markVehicleAsSold(s2.patente, { saleOwner: 'self', soldAt: iso(1).slice(0, 10) });
  stockService.updateVehicle(s2.patente, { clienteNombre: 'Martín Gómez' });
  // Presupuestos: 2 días sin respuesta, 7 días (2º seguimiento) y uno de hoy
  const clientes: [string, string, number, number][] = [
    ['Carla Ruiz', '2995123456', 2, 0],
    ['Diego Paredes', '2994987654', 8, 1],
    ['Sofía Medina', '2996554433', 0, 0],
  ];
  const budgets = clientes.map(([nombre, telefono, ago, retomados], i) => {
    const v = avail[40 + i];
    const b = quoteService.buildBudget({ vehicle: v, dnrpaTableValue: v.precio || 0, province: 'Neuquén' });
    return {
      ...b,
      fechaEmision: iso(ago),
      datosCliente: { nombre, telefono },
      seguimiento: { estado: 'enviado', retomados },
    };
  });
  try {
    localStorage.setItem('autonet_saved_budgets_v1', JSON.stringify(budgets));
    localStorage.setItem(FLAG, '1');
  } catch {
    /* sin almacenamiento */
  }
}
