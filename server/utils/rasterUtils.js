const axios = require("axios");
const { fromArrayBuffer } = require("geotiff");

async function fetchGeoTiff(url, apiKey) {
  const response = await axios.get(url, {
    params: { key: apiKey },
    responseType: "arraybuffer",
  });

  const arrayBuffer = response.data.buffer.slice(
    response.data.byteOffset,
    response.data.byteOffset + response.data.byteLength
  );

  const tiff = await fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();
  const rasters = await image.readRasters();

  return {
    image,
    rasters,
    width: image.getWidth(),
    height: image.getHeight(),
    bbox: image.getBoundingBox(), // [minX, minY, maxX, maxY]
    samplesPerPixel: image.getSamplesPerPixel(),
    resolution: image.getResolution(),
  };
}

function latLngToPixel(lat, lng, bbox, width, height) {
  const [minX, minY, maxX, maxY] = bbox;

  const x = Math.floor(((lng - minX) / (maxX - minX)) * width);
  const y = Math.floor(((maxY - lat) / (maxY - minY)) * height);

  return {
    x: Math.max(0, Math.min(width - 1, x)),
    y: Math.max(0, Math.min(height - 1, y)),
  };
}

function pixelIndex(x, y, width) {
  return y * width + x;
}

function getBandValue(rasterBand, x, y, width) {
  return rasterBand[pixelIndex(x, y, width)];
}

function decodeShadeValue(int32Value, day) {
  if (int32Value < 0) return null;
  const bit = 1 << (day - 1);
  return (int32Value & bit) !== 0;
}

function monthIndexFromOneBased(month) {
  return month - 1;
}

function getMonthlyFluxValue(monthlyFluxData, month, x, y) {
  const monthIdx = monthIndexFromOneBased(month);
  const band = monthlyFluxData.rasters[monthIdx];
  return getBandValue(band, x, y, monthlyFluxData.width);
}

module.exports = {
  fetchGeoTiff,
  latLngToPixel,
  pixelIndex,
  getBandValue,
  decodeShadeValue,
  monthIndexFromOneBased,
  getMonthlyFluxValue,
};