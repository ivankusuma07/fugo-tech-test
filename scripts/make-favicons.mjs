// Rasterizes the logo mark (same geometry as public/favicon.svg) into PNG and ICO
// files without native deps. Run: node scripts/make-favicons.mjs
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const INK = [0x17, 0x18, 0x1C]
const CANVAS = [0xF6, 0xF5, 0xF2]
const HALF = 3.6 / 2

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}

/** Distance to the "f" stroke, in 32-unit space. */
function fDist(x, y) {
  let d = Math.min(
    segDist(x, y, 14.5, 24.25, 14.5, 11.75),
    segDist(x, y, 18.5, 7.75, 21, 7.75),
    segDist(x, y, 11, 15, 19, 15),
  )
  if (x <= 18.5 && y <= 11.75) d = Math.min(d, Math.abs(Math.hypot(x - 18.5, y - 11.75) - 4))
  return d
}

/** Inside the square with corner radius `rx` (0 = full-bleed)? */
function inRect(x, y, rx) {
  const cx = Math.min(Math.max(x, rx), 32 - rx), cy = Math.min(Math.max(y, rx), 32 - rx)
  return Math.hypot(x - cx, y - cy) <= rx
}

function render(size, rx) {
  const S = 4 // 4x4 supersampling
  const rgba = Buffer.alloc(size * size * 4)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let bg = 0, fg = 0
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const x = ((px + (sx + 0.5) / S) / size) * 32, y = ((py + (sy + 0.5) / S) / size) * 32
          if (!inRect(x, y, rx)) continue
          if (fDist(x, y) <= HALF) fg++
          else bg++
        }
      }
      const cov = bg + fg, o = (py * size + px) * 4
      if (!cov) continue
      for (let c = 0; c < 3; c++) rgba[o + c] = Math.round((INK[c] * bg + CANVAS[c] * fg) / cov)
      rgba[o + 3] = Math.round((cov / (S * S)) * 255)
    }
  }
  return rgba
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xFFFFFFFF
  for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4), crc = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size, rx) {
  const rgba = render(size, rx)
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
/** ICO with embedded PNGs (supported by every current browser). */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i
    header[e] = size >= 256 ? 0 : size
    header[e + 1] = size >= 256 ? 0 : size
    header.writeUInt16LE(1, e + 4)
    header.writeUInt16LE(32, e + 6)
    header.writeUInt32LE(data.length, e + 8)
    header.writeUInt32LE(offset, e + 12)
    offset += data.length
  })
  return Buffer.concat([header, ...images.map(i => i.data)])
}

const out = new URL('../public/', import.meta.url)
writeFileSync(new URL('favicon.ico', out), ico([16, 32, 48].map(size => ({ size, data: png(size, 9) }))))
// iOS rounds the corners itself, so the touch icon is a full square
writeFileSync(new URL('apple-touch-icon.png', out), png(180, 0))
writeFileSync(new URL('icon-512.png', out), png(512, 9))
console.log('favicons written to public/')
