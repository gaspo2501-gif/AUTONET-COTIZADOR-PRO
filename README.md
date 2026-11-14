# Autonet Cotizador PRO

Versión PRO del cotizador de Autonet Neuquén (stock de usados, cotización y transferencia DNRPA, presupuestos, boletos, ventas y comisiones).

- Usa la misma base de datos (Firebase) y el mismo formato de datos que **AUTONET-COTIZADOR**: cada asesor ve solo lo suyo.
- La app original sigue funcionando igual; los cambios de esta versión no la afectan.
- Se publica sola en GitHub Pages con cada envío a `main` (`.github/workflows/deploy.yml`).

## Configuración del repositorio (una sola vez)

1. **Settings → Pages → Source:** GitHub Actions.
2. **Settings → Secrets and variables → Actions → Variables:** las mismas 6 variables `VITE_FIREBASE_*` del repositorio original.
3. **Secrets:** `AUTONET_API_KEY` (opcional: fotos y publicaciones de la web de Autonet).

## Desarrollo

```
npm ci
npm run dev                         # app real (sin stock precargado)
npx vite build --mode demo          # demo con stock de ejemplo
```
