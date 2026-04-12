import { Buffer } from 'buffer';
import UPNG from 'upng-js';

export function imageDataToDataUri(imageData) {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return null;
  }

  const rgba = imageData.data instanceof Uint8ClampedArray
    ? imageData.data
    : new Uint8ClampedArray(imageData.data);

  const pngBuffer = UPNG.encode([rgba.buffer], imageData.width, imageData.height, 0);
  const base64 = Buffer.from(new Uint8Array(pngBuffer)).toString('base64');

  return `data:image/png;base64,${base64}`;
}