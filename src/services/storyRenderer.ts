import { Vehicle } from '../types/stock';
import { ADVISOR_INFO } from '../constants/advisor';
import { formatCurrency, formatKm } from '../utils/formatters';

/**
 * GENERADOR DE HISTORIAS 1080×1920 (Instagram / estados de WhatsApp)
 * Estilo salón Autonet: logo centrado, cinta roja con la marca, modelo grande, auto protagonista,
 * datos con íconos, precio contado destacado, beneficios y pie con WhatsApp + asesor.
 */

export const STORY_W = 1080;
export const STORY_H = 1920;

const C = {
  navy: '#0f1f45',
  navySoft: '#1e3a6e',
  red: '#e11d2e',
  redDark: '#bf1424',
  ink: '#0f172a',
  muted: '#64748b',
  line: '#e2e8f0',
  bg1: '#ffffff',
  bg2: '#eef2f7',
  green: '#16a34a',
};

const SANS = "'Plus Jakarta Sans', 'Segoe UI', Roboto, Arial, sans-serif";
const DISPLAY = "'Space Grotesk', 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";

export interface StoryOptions {
  photo?: HTMLImageElement | null;
  /** Precio anterior: activa la variante "¡NUEVO PRECIO!". */
  oldPrice?: number | null;
  benefits?: string[];
}

export async function ensureStoryFonts(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load(`800 120px ${SANS}`),
      document.fonts.load(`700 120px ${DISPLAY}`),
      document.fonts.load(`600 40px ${SANS}`),
      document.fonts.load(`italic 800 30px ${SANS}`),
      document.fonts.load(`500 28px ${SANS}`),
    ]);
  } catch {
    /* se usan las fuentes de respaldo */
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, start: number, weight: number, family: string, min = 40) {
  let size = start;
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  } while (size > min);
  return size;
}

function drawCheck(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = s * 0.14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x + s * 0.28, y + s * 0.52);
  ctx.lineTo(x + s * 0.44, y + s * 0.68);
  ctx.lineTo(x + s * 0.73, y + s * 0.36);
  ctx.stroke();
  ctx.restore();
}

function drawWhatsappIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.fillStyle = '#25d366';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Globo de diálogo + tubo simplificado
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = r * 0.13;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.52, Math.PI * 0.75, Math.PI * 2.55);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.38, cy + r * 0.36);
  ctx.lineTo(cx - r * 0.5, cy + r * 0.6);
  ctx.lineTo(cx - r * 0.18, cy + r * 0.5);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx - r * 0.12, cy - r * 0.1, r * 0.09, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.16, cy + r * 0.16, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ---------- Íconos simples dibujados con trazos (sin depender de fuentes) ---------- */
function iconStroke(ctx: CanvasRenderingContext2D, color: string, w: number) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}
function drawCalendar(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  iconStroke(ctx, color, s * 0.09);
  roundRect(ctx, cx - s / 2, cy - s * 0.38, s, s * 0.82, s * 0.1);
  ctx.stroke();
  ctx.fillRect(cx - s / 2, cy - s * 0.38, s, s * 0.2);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.25, cy - s * 0.5);
  ctx.lineTo(cx - s * 0.25, cy - s * 0.3);
  ctx.moveTo(cx + s * 0.25, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.25, cy - s * 0.3);
  ctx.stroke();
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) ctx.fillRect(cx - s * 0.36 + c * s * 0.22, cy - s * 0.06 + r * s * 0.16, s * 0.12, s * 0.09);
  ctx.restore();
}
function drawGauge(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  iconStroke(ctx, color, s * 0.09);
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.18, s * 0.5, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  for (let i = 0; i <= 4; i++) {
    const a = Math.PI * (1.15 + i * 0.175);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * s * 0.34, cy + s * 0.18 + Math.sin(a) * s * 0.34);
    ctx.lineTo(cx + Math.cos(a) * s * 0.42, cy + s * 0.18 + Math.sin(a) * s * 0.42);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.18);
  ctx.lineTo(cx + s * 0.24, cy - s * 0.08);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.18, s * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function drawFuel(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  iconStroke(ctx, color, s * 0.09);
  roundRect(ctx, cx - s * 0.42, cy - s * 0.48, s * 0.56, s * 0.94, s * 0.06);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - s * 0.32, cy - s * 0.38, s * 0.36, s * 0.24);
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.14, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.3, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.3);
  ctx.quadraticCurveTo(cx + s * 0.3, cy + s * 0.42, cx + s * 0.4, cy + s * 0.42);
  ctx.quadraticCurveTo(cx + s * 0.5, cy + s * 0.42, cx + s * 0.5, cy + s * 0.3);
  ctx.lineTo(cx + s * 0.5, cy - s * 0.2);
  ctx.lineTo(cx + s * 0.36, cy - s * 0.38);
  ctx.stroke();
  ctx.restore();
}
function drawGear(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  iconStroke(ctx, color, s * 0.1);
  const xs = [-0.34, 0, 0.34];
  xs.forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(cx + x * s, cy - s * 0.42);
    ctx.lineTo(cx + x * s, x === 0 ? cy + s * 0.46 : cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + x * s, cy - s * 0.42, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.34, cy);
  ctx.lineTo(cx + s * 0.34, cy);
  ctx.stroke();
  ctx.restore();
}
function drawHandshake(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  // puños de las mangas
  ctx.fillRect(cx - s * 0.74, cy - s * 0.3, s * 0.2, s * 0.42);
  ctx.fillRect(cx + s * 0.54, cy - s * 0.3, s * 0.2, s * 0.42);
  // manos entrelazadas
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.54, cy - s * 0.24);
  ctx.lineTo(cx - s * 0.2, cy - s * 0.36);
  ctx.lineTo(cx + s * 0.06, cy - s * 0.22);
  ctx.lineTo(cx + s * 0.22, cy - s * 0.34);
  ctx.lineTo(cx + s * 0.54, cy - s * 0.24);
  ctx.lineTo(cx + s * 0.54, cy + s * 0.06);
  ctx.lineTo(cx + s * 0.16, cy + s * 0.36);
  ctx.quadraticCurveTo(cx - s * 0.02, cy + s * 0.44, cx - s * 0.16, cy + s * 0.3);
  ctx.lineTo(cx - s * 0.54, cy + s * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#f3f3f1';
  ctx.lineWidth = s * 0.06;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.1, cy - s * 0.12);
  ctx.lineTo(cx + s * 0.14, cy + s * 0.12);
  ctx.moveTo(cx - s * 0.2, cy + s * 0.0);
  ctx.lineTo(cx + s * 0.04, cy + s * 0.24);
  ctx.moveTo(cx + s * 0.06, cy - s * 0.22);
  ctx.lineTo(cx - s * 0.16, cy - s * 0.04);
  ctx.stroke();
  ctx.restore();
}
function drawCarIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  iconStroke(ctx, color, s * 0.09);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.55, cy + s * 0.12);
  ctx.lineTo(cx - s * 0.5, cy - s * 0.08);
  ctx.lineTo(cx - s * 0.32, cy - s * 0.32);
  ctx.lineTo(cx + s * 0.32, cy - s * 0.32);
  ctx.lineTo(cx + s * 0.5, cy - s * 0.08);
  ctx.lineTo(cx + s * 0.55, cy + s * 0.12);
  ctx.lineTo(cx + s * 0.55, cy + s * 0.28);
  ctx.lineTo(cx - s * 0.55, cy + s * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.26, cy - s * 0.24);
  ctx.lineTo(cx + s * 0.26, cy - s * 0.24);
  ctx.lineTo(cx + s * 0.38, cy - s * 0.06);
  ctx.lineTo(cx - s * 0.38, cy - s * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - s * 0.32, cy + s * 0.08, s * 0.08, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.32, cy + s * 0.08, s * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(cx - s * 0.48, cy + s * 0.28, s * 0.16, s * 0.12);
  ctx.fillRect(cx + s * 0.32, cy + s * 0.28, s * 0.16, s * 0.12);
  ctx.restore();
}
function drawShield(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.42, cy - s * 0.34);
  ctx.lineTo(cx + s * 0.42, cy + s * 0.02);
  ctx.quadraticCurveTo(cx + s * 0.38, cy + s * 0.36, cx, cy + s * 0.52);
  ctx.quadraticCurveTo(cx - s * 0.38, cy + s * 0.36, cx - s * 0.42, cy + s * 0.02);
  ctx.lineTo(cx - s * 0.42, cy - s * 0.34);
  ctx.closePath();
  ctx.fill();
  iconStroke(ctx, '#ffffff', s * 0.1);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.17, cy);
  ctx.lineTo(cx - s * 0.03, cy + s * 0.14);
  ctx.lineTo(cx + s * 0.2, cy - s * 0.14);
  ctx.stroke();
  ctx.restore();
}

/** Logo de texto: "auto" azul marino + "net" rojo, centrado en cx. */
function drawWordmark(ctx: CanvasRenderingContext2D, cx: number, baseline: number, size: number) {
  ctx.font = `800 ${size}px ${SANS}`;
  const wa = ctx.measureText('auto').width;
  const wn = ctx.measureText('net').width;
  const x0 = cx - (wa + wn) / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = C.navy;
  ctx.fillText('auto', x0, baseline);
  ctx.fillStyle = C.red;
  ctx.fillText('net', x0 + wa, baseline);
  return wa + wn;
}

export function drawStory(canvas: HTMLCanvasElement, v: Vehicle, opts: StoryOptions = {}): void {
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext('2d')!;
  const W = STORY_W;
  const H = STORY_H;
  const PAD = 72;
  const isNewPrice = Boolean(opts.oldPrice && v.precio && opts.oldPrice > v.precio);
  ctx.textBaseline = 'alphabetic';

  // ---------- Fondo: salón claro (pared, luces y piso) ----------
  const wall = ctx.createLinearGradient(0, 0, 0, 1180);
  wall.addColorStop(0, '#f4f4f2');
  wall.addColorStop(1, '#ffffff');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, H);
  [180, 540, 900].forEach((x) => {
    const glow = ctx.createRadialGradient(x, 40, 4, x, 40, 220);
    glow.addColorStop(0, 'rgba(255,255,255,0.95)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 220, 0, 440, 280);
  });
  const floor = ctx.createLinearGradient(0, 1180, 0, H);
  floor.addColorStop(0, '#e9e9e6');
  floor.addColorStop(1, '#dcdcd8');
  ctx.fillStyle = floor;
  ctx.fillRect(0, 1180, W, H - 1180);

  // ---------- Encabezado: logo centrado entre líneas ----------
  const logoW = drawWordmark(ctx, W / 2, 128, 96);
  ctx.font = `800 30px ${SANS}`;
  ctx.fillStyle = C.navy;
  ctx.textAlign = 'center';
  ctx.fillText('TUS SUEÑOS EN MARCHA', W / 2, 176);
  ctx.textAlign = 'left';
  ctx.strokeStyle = C.navy;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(PAD + 20, 110);
  ctx.lineTo(W / 2 - logoW / 2 - 34, 110);
  ctx.moveTo(W / 2 + logoW / 2 + 34, 110);
  ctx.lineTo(W - PAD - 20, 110);
  ctx.stroke();

  // ---------- Cinta roja con la marca ----------
  const ribbonY = 212;
  const brand = (isNewPrice ? '¡NUEVO PRECIO!' : v.marca || '').toUpperCase();
  const bSize = fitText(ctx, brand, W * 0.6, 58, 800, SANS, 34);
  ctx.font = `800 ${bSize}px ${SANS}`;
  const brandW = ctx.measureText(brand).width;
  ctx.fillStyle = isNewPrice ? C.redDark : C.red;
  ctx.beginPath();
  ctx.moveTo(0, ribbonY);
  ctx.lineTo(PAD + brandW + 84, ribbonY);
  ctx.lineTo(PAD + brandW + 44, ribbonY + 84);
  ctx.lineTo(0, ribbonY + 84);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(brand, PAD + 12, ribbonY + 42 + bSize * 0.36);

  // ---------- Modelo grande + versión ----------
  const model = (isNewPrice ? `${v.marca} ${v.modelo}` : v.modelo || '').toUpperCase();
  const mSize = fitText(ctx, model, W - PAD * 2, 178, 800, SANS, 80);
  ctx.font = `800 ${mSize}px ${SANS}`;
  ctx.fillStyle = C.navy;
  const modelBase = 330 + mSize * 0.78;
  ctx.fillText(model, PAD - 4, modelBase);
  const modelW = ctx.measureText(model).width;
  // líneas finas de "luz" a la derecha del modelo, como en el salón
  if (modelW < W - PAD * 2 - 140) {
    ctx.strokeStyle = 'rgba(11,27,58,0.85)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(PAD + modelW + 30, modelBase - mSize * 0.72);
    ctx.lineTo(W - PAD, modelBase - mSize * 0.72);
    ctx.moveTo(PAD + modelW + 30, modelBase - mSize * 0.08);
    ctx.lineTo(W - PAD - 40, modelBase - mSize * 0.08);
    ctx.stroke();
  }
  const version = (v.version || '').toUpperCase();
  const vSize = fitText(ctx, version, W - PAD * 2, 50, 800, SANS, 28);
  ctx.font = `800 ${vSize}px ${SANS}`;
  ctx.fillText(version, PAD, modelBase + 22 + vSize);
  const textBottom = modelBase + 22 + vSize;

  // ---------- Auto protagonista (foto de la web, a lo ancho y fundida con el salón) ----------
  const photoY = Math.max(560, textBottom + 40);
  const photoH = 1320 - photoY;
  if (opts.photo && opts.photo.naturalWidth) {
    const img = opts.photo;
    const scale = Math.max(W / img.naturalWidth, photoH / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, photoY, W, photoH);
    ctx.clip();
    ctx.drawImage(img, (W - dw) / 2, photoY + (photoH - dh) / 2, dw, dh);
    ctx.restore();
    // fundidos arriba y abajo para que la foto se integre al fondo
    const top = ctx.createLinearGradient(0, photoY, 0, photoY + 150);
    top.addColorStop(0, 'rgba(255,255,255,1)');
    top.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, photoY, W, 150);
    const bottom = ctx.createLinearGradient(0, photoY + photoH - 120, 0, photoY + photoH);
    bottom.addColorStop(0, 'rgba(233,233,230,0)');
    bottom.addColorStop(1, 'rgba(233,233,230,1)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, photoY + photoH - 120, W, 120);
  } else {
    ctx.fillStyle = 'rgba(11,27,58,0.06)';
    ctx.fillRect(0, photoY, W, photoH);
    ctx.fillStyle = 'rgba(11,27,58,0.35)';
    ctx.font = `700 40px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText('Agregá la foto de la unidad', W / 2, photoY + photoH / 2);
    ctx.textAlign = 'left';
  }

  // ---------- Datos: año / km / combustible / caja con íconos ----------
  const specs = [
    { t: String(v.anio || ''), d: drawCalendar },
    { t: formatKm(v.kilometraje).toUpperCase(), d: drawGauge },
    { t: (v.combustible || '').toUpperCase(), d: drawFuel },
    { t: v.caja === 'Automática' ? 'AUTOMÁTICA' : v.caja ? 'MANUAL' : '', d: drawGear },
  ].filter((x) => x.t);
  const colW = (W - PAD * 2) / specs.length;
  const specY = 1352;
  specs.forEach((sp, i) => {
    const cx = PAD + colW * i + colW / 2;
    sp.d(ctx, cx, specY + 10, 50, C.navy);
    const fs = fitText(ctx, sp.t, colW - 24, 34, 800, SANS, 22);
    ctx.font = `800 ${fs}px ${SANS}`;
    ctx.fillStyle = C.navy;
    ctx.textAlign = 'center';
    ctx.fillText(sp.t, cx, specY + 88);
    ctx.textAlign = 'left';
    if (i > 0) {
      ctx.fillStyle = 'rgba(11,27,58,0.55)';
      ctx.fillRect(PAD + colW * i - 1.5, specY - 22, 3, 120);
    }
  });

  // ---------- Precio destacado (bloque azul con corte rojo) ----------
  const priceY = 1468;
  const priceH = 184;
  const px0 = PAD - 16;
  const px1 = W - PAD + 16;
  ctx.fillStyle = C.red;
  ctx.beginPath();
  ctx.moveTo(px0 + 34, priceY);
  ctx.lineTo(px0 + 74, priceY);
  ctx.lineTo(px0 + 40, priceY + priceH);
  ctx.lineTo(px0, priceY + priceH);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.navy;
  ctx.beginPath();
  ctx.moveTo(px0 + 74, priceY);
  ctx.lineTo(px1 - 24, priceY);
  ctx.arcTo(px1, priceY, px1, priceY + 24, 24);
  ctx.lineTo(px1, priceY + priceH - 24);
  ctx.arcTo(px1, priceY + priceH, px1 - 24, priceY + priceH, 24);
  ctx.lineTo(px0 + 40, priceY + priceH);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `800 36px ${SANS}`;
  ctx.fillText(isNewPrice ? 'AHORA CONTADO' : 'PRECIO CONTADO', px0 + 112, priceY + 56);
  if (isNewPrice) {
    const old = formatCurrency(opts.oldPrice!, v.moneda);
    ctx.font = `700 34px ${SANS}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(old, px1 - 36, priceY + 56);
    const ow = ctx.measureText(old).width;
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(px1 - 36 - ow, priceY + 44);
    ctx.lineTo(px1 - 36, priceY + 44);
    ctx.stroke();
    ctx.textAlign = 'left';
  }
  const priceText = formatCurrency(v.precio, v.moneda);
  const pSize = fitText(ctx, priceText, px1 - px0 - 150, 128, 800, SANS, 60);
  ctx.fillStyle = '#fff';
  ctx.font = `800 ${pSize}px ${SANS}`;
  ctx.fillText(priceText, px0 + 108, priceY + 66 + pSize * 0.82);

  // ---------- Beneficios con íconos ----------
  const benefits = (opts.benefits && opts.benefits.length ? opts.benefits : ['Financiación', 'Tomamos tu usado', 'Transferencia']).slice(0, 3);
  const bIcons = [drawHandshake, drawCarIcon, drawShield];
  const by = 1716;
  const avail = W - PAD * 2 + 40;
  const ICON = 64; // ícono + aire hasta el texto
  let bfs = 32;
  let widths: number[] = [];
  for (; bfs >= 20; bfs--) {
    ctx.font = `800 ${bfs}px ${SANS}`;
    widths = benefits.map((b) => ICON + ctx.measureText(b).width);
    if (widths.reduce((a, w) => a + w, 0) + 60 * (benefits.length - 1) <= avail) break;
  }
  const gap = (avail - widths.reduce((a, w) => a + w, 0)) / Math.max(1, benefits.length - 1);
  let bx = PAD - 20;
  benefits.forEach((b, i) => {
    if (i > 0) {
      ctx.fillStyle = 'rgba(11,27,58,0.55)';
      ctx.fillRect(bx - gap / 2 - 1.5, by - 44, 3, 64);
    }
    bIcons[i % 3](ctx, bx + 24, by - 11, 44, C.navy);
    ctx.font = `800 ${bfs}px ${SANS}`;
    ctx.fillStyle = C.navy;
    ctx.fillText(b, bx + ICON, by);
    bx += widths[i] + gap;
  });

  // ---------- Pie: WhatsApp + asesor | "Consultá por otras publicaciones" ----------
  const footY = 1780;
  ctx.fillStyle = C.navy;
  ctx.fillRect(0, footY, W, H - footY);
  ctx.fillStyle = C.red;
  ctx.fillRect(0, footY, W, 6);
  const split = 690;
  ctx.fillStyle = C.red;
  ctx.beginPath();
  ctx.moveTo(split, footY);
  ctx.lineTo(W, footY);
  ctx.lineTo(W, H);
  ctx.lineTo(split + 40, H);
  ctx.closePath();
  ctx.fill();
  drawWhatsappIcon(ctx, PAD + 22, footY + 74, 46);
  ctx.fillStyle = '#fff';
  const phone = ADVISOR_INFO.telefonoFormateado || ADVISOR_INFO.telefono;
  const phSize = fitText(ctx, phone, split - PAD - 110, 52, 800, SANS, 30);
  ctx.font = `800 ${phSize}px ${SANS}`;
  ctx.fillText(phone, PAD + 88, footY + 74);
  const who = `${ADVISOR_INFO.nombre}  |  Asesor comercial`;
  const wSize = fitText(ctx, who, split - PAD - 110, 28, 500, SANS, 18);
  ctx.font = `500 ${wSize}px ${SANS}`;
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillText(who, PAD + 88, footY + 116);
  ctx.fillStyle = '#fff';
  ctx.font = `italic 800 30px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('Consultá por otras', split + 172, footY + 66);
  ctx.fillText('publicaciones', split + 172, footY + 104);
  ctx.textAlign = 'left';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(W - 56, footY + 56);
  ctx.lineTo(W - 36, footY + 80);
  ctx.lineTo(W - 56, footY + 104);
  ctx.stroke();
}

/** Carga una imagen intentando que el canvas pueda exportarse (CORS). */
export function loadImage(src: string, cors = true): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = src;
  });
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo exportar la imagen'))), 'image/png');
    } catch (e) {
      reject(e);
    }
  });
}

export function storyFileName(v: Vehicle, variant: 'normal' | 'precio') {
  const base = `${v.marca}-${v.modelo}-${v.anio}-${v.patente}`.replace(/[^\w-]+/g, '_');
  return `historia_${variant === 'precio' ? 'nuevo-precio_' : ''}${base}.png`;
}
