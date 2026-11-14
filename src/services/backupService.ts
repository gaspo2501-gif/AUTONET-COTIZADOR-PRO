import { stockService } from './stockService';
import { quoteService } from './quoteService';
import { boletoHistoryService } from './boletoHistoryService';
import { authService } from './authService';
import { todayISO } from '../utils/dates';

/**
 * COPIA DE SEGURIDAD COMPLETA
 * Junta en un solo archivo todo lo del usuario: stock (con los datos de cada venta y comisión),
 * historial de cargas, presupuestos, boletos y todos los ajustes guardados en este dispositivo.
 * Solo lee: no modifica ni borra nada.
 */
export const backupService = {
  build() {
    const local: Record<string, unknown> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith('autonet_')) continue;
        const raw = localStorage.getItem(k);
        try {
          local[k] = raw ? JSON.parse(raw) : raw;
        } catch {
          local[k] = raw;
        }
      }
    } catch {
      /* sin almacenamiento */
    }
    const vehicles = stockService.getAllVehicles();
    return {
      app: 'Autonet Cotizador',
      version: 1,
      exportedAt: new Date().toISOString(),
      usuario: authService.getCurrentUser()?.email || null,
      resumen: {
        unidades: vehicles.length,
        ventasPropias: vehicles.filter((v) => v.saleOwner === 'self').length,
        presupuestos: quoteService.getBudgetHistory().length,
        boletos: boletoHistoryService.getAll().length,
      },
      datos: {
        stock: vehicles,
        historialCargas: stockService.getUpdateHistory(),
        presupuestos: quoteService.getBudgetHistory(),
        boletos: boletoHistoryService.getAll(),
      },
      almacenamientoLocal: local,
    };
  },

  download(): { fileName: string; resumen: ReturnType<typeof backupService.build>['resumen'] } {
    const data = backupService.build();
    const fileName = `autonet_copia_completa_${todayISO()}.json`;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return { fileName, resumen: data.resumen };
  },
};
