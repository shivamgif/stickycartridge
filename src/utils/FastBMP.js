// MODULE: FastBMP | ROLE: Ultra-fast raw pixel buffer to BMP data URI conversion (no compression) | API: encodeBMP

import { Buffer } from 'buffer';

/**
 * Encodes a raw RGBA pixel buffer to a BMP Data URI.
 * BMP is much faster to encode than PNG as it involves no compression.
 * Note: BMP expects pixels in BGR(A) format and bottom-to-top order.
 */
export function encodeBMP(data, width, height) {
  const fileHeaderSize = 14;
  const dibHeaderSize = 40;
  const pixelDataSize = width * height * 4;
  const fileSize = fileHeaderSize + dibHeaderSize + pixelDataSize;

  const buffer = Buffer.alloc(fileSize);

  // ── File Header ──
  buffer.write('BM', 0); // Signature
  buffer.writeUInt32LE(fileSize, 2); // File size
  buffer.writeUInt32LE(0, 6); // Reserved
  buffer.writeUInt32LE(fileHeaderSize + dibHeaderSize, 10); // Offset to pixel data

  // ── DIB Header (BITMAPINFOHEADER) ──
  buffer.writeUInt32LE(dibHeaderSize, 14); // Header size
  buffer.writeInt32LE(width, 18); // Width
  buffer.writeInt32LE(-height, 22); // Height (Negative for top-to-bottom)
  buffer.writeUInt16LE(1, 26); // Planes
  buffer.writeUInt16LE(32, 28); // Bits per pixel (32 for RGBA)
  buffer.writeUInt32LE(0, 30); // Compression (0 = BI_RGB, no compression)
  buffer.writeUInt32LE(pixelDataSize, 34); // Image size
  buffer.writeInt32LE(2835, 38); // X pixels per meter (72 DPI)
  buffer.writeInt32LE(2835, 42); // Y pixels per meter (72 DPI)
  buffer.writeUInt32LE(0, 46); // Colors in palette
  buffer.writeUInt32LE(0, 50); // Important colors

  // ── Pixel Data (RGBA → BGRA) ──
  // Most emulators provide RGBA. BMP wants BGRA.
  const pixels = new Uint8Array(data);
  let offset = 54;
  for (let i = 0; i < pixels.length; i += 4) {
    buffer[offset++] = pixels[i + 2]; // B
    buffer[offset++] = pixels[i + 1]; // G
    buffer[offset++] = pixels[i];     // R
    buffer[offset++] = pixels[i + 3]; // A
  }

  return `data:image/bmp;base64,${buffer.toString('base64')}`;
}
