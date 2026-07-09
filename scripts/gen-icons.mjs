// Generates the GhostTranslate extension icons (no external deps).
// A blue rounded-gradient tile with a white ghost glyph.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../public/icons');
mkdirSync(OUT, { recursive: true });

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // rest 0 (compression, filter, interlace)
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function draw(size) {
  const buf = Buffer.alloc(size * size * 4);
  const r = size * 0.22; // corner radius
  const cx = size / 2;
  // ghost geometry
  const headR = size * 0.26;
  const ghostCx = cx;
  const ghostCy = size * 0.44;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Rounded-rect mask.
      const inside = roundedRect(x, y, size, size, r);
      if (!inside) {
        buf[i + 3] = 0;
        continue;
      }

      // Diagonal blue->indigo gradient.
      const t = (x + y) / (2 * size);
      let cr = lerp(10, 94, t);
      let cg = lerp(132, 92, t);
      let cb = lerp(255, 230, t);

      // Ghost body: head circle + skirt rectangle.
      const dx = x - ghostCx;
      const dy = y - ghostCy;
      const inHead = dx * dx + dy * dy <= headR * headR;
      const inBody =
        Math.abs(dx) <= headR &&
        y >= ghostCy &&
        y <= ghostCy + size * 0.24 &&
        wavyBottom(x, y, ghostCx, headR, ghostCy + size * 0.24, size);

      if (inHead || inBody) {
        cr = 255;
        cg = 255;
        cb = 255;
        // eyes
        const eyeY = ghostCy - headR * 0.05;
        const eR = size * 0.045;
        const e1 = (x - (ghostCx - headR * 0.4)) ** 2 + (y - eyeY) ** 2 <= eR * eR;
        const e2 = (x - (ghostCx + headR * 0.4)) ** 2 + (y - eyeY) ** 2 <= eR * eR;
        if (e1 || e2) {
          cr = 10;
          cg = 110;
          cb = 240;
        }
      }

      buf[i] = cr;
      buf[i + 1] = cg;
      buf[i + 2] = cb;
      buf[i + 3] = 255;
    }
  }
  return buf;
}

function roundedRect(x, y, w, h, r) {
  const rx = Math.min(Math.max(x, r), w - r);
  const ry = Math.min(Math.max(y, r), h - r);
  const dx = x - rx;
  const dy = y - ry;
  return dx * dx + dy * dy <= r * r;
}

function wavyBottom(x, y, cx, headR, baseY, size) {
  // Three bumps along the bottom edge.
  const local = (x - (cx - headR)) / (2 * headR);
  const wave = Math.sin(local * Math.PI * 3) * size * 0.03;
  return y <= baseY - Math.max(0, wave) || y <= baseY;
}

for (const size of [16, 32, 48, 128]) {
  const png = encodePng(size, size, draw(size));
  writeFileSync(resolve(OUT, `icon-${size}.png`), png);
  console.log(`icon-${size}.png (${png.length} bytes)`);
}
