const { PNG } = require("pngjs");

function getFluxMinMax(pixels, maskPixels = null) {
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < pixels.length; i++) {
    const value = pixels[i];

    // Skip nodata values
    if (value === -9999 || value == null || Number.isNaN(value)) continue;

    // Skip non-roof pixels when mask is provided
    if (maskPixels !== null && maskPixels[i] !== 1) continue;

    if (value < min) min = value;
    if (value > max) max = value;
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1 };
  }

  return { min, max };
}

function fluxToYellowRGBA(value, min, max) {
  if (value === -9999 || value == null || Number.isNaN(value)) {
    return [0, 0, 0, 0]; // fully transparent
  }

  const t = max > min ? (value - min) / (max - min) : 0;
  const clamped = Math.max(0, Math.min(1, t));

  const r = 255;
  const g = Math.round(235 - clamped * 55);
  const b = Math.round(90 - clamped * 90);
  const a = Math.round(120 + clamped * 135);

  return [r, g, b, a];
}

// Resizes a binary mask to target dimensions using nearest-neighbor sampling.
// This ensures mask[i] and fluxPixels[i] always refer to the same geographic spot.
function resizeMaskNearest(maskPixels, maskWidth, maskHeight, targetWidth, targetHeight) {
  const output = new Float32Array(targetWidth * targetHeight);

  for (let ty = 0; ty < targetHeight; ty++) {
    for (let tx = 0; tx < targetWidth; tx++) {
      // Map target pixel back to source pixel
      const sx = Math.min(maskWidth - 1, Math.floor((tx / targetWidth) * maskWidth));
      const sy = Math.min(maskHeight - 1, Math.floor((ty / targetHeight) * maskHeight));
      output[ty * targetWidth + tx] = maskPixels[sy * maskWidth + sx];
    }
  }

  return output;
}

function createMonthlyFluxOverlayPngBase64(pixels, width, height, maskPixels = null, maskWidth = null, 
  maskHeight = null) {

  // Resample mask to exactly match flux crop size if dimensions differ
  let finalMask = null;
  if (maskPixels !== null) {
    if (maskWidth === width && maskHeight === height) {
      finalMask = maskPixels;
    } else {
      finalMask = resizeMaskNearest(maskPixels, maskWidth, maskHeight, width, height);
    }
  }
  
  // When mask is active, only count roof pixels for min/max normalization
  // so the color scale reflects actual roof flux range, not streets/trees
  const { min, max } = getFluxMinMax(pixels, finalMask);

  const png = new PNG({ width, height });

  for (let i = 0; i < pixels.length; i++) {
    const idx = i * 4;

    // If mask provided and this pixel is NOT a roof pixel → fully transparent
    if (maskPixels !== null && finalMask[i] !== 1) {
      png.data[idx]     = 0;
      png.data[idx + 1] = 0;
      png.data[idx + 2] = 0;
      png.data[idx + 3] = 0;
      continue;
    }

    const [r, g, b, a] = fluxToYellowRGBA(pixels[i], min, max);
    png.data[idx]     = r;
    png.data[idx + 1] = g;
    png.data[idx + 2] = b;
    png.data[idx + 3] = a;
  }

  const buffer = PNG.sync.write(png);

  return {
    imageUrl: `data:image/png;base64,${buffer.toString("base64")}`,
    minFlux: min,
    maxFlux: max,
  };
}

module.exports = { createMonthlyFluxOverlayPngBase64 };