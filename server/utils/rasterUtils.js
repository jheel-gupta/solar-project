const axios = require("axios");
const proj4 = require("proj4");
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
    bbox: image.getBoundingBox(), // in the raster's native CRS, NOT necessarily lat/lng
    geoKeys: image.getGeoKeys(),  // <-- NEW: tells us what that CRS actually is
    samplesPerPixel: image.getSamplesPerPixel(),
    resolution: image.getResolution(),
  };
}

// Google Solar API GeoTIFFs are stored in UTM (EPSG:326xx / 327xx), in meters.
// bbox values like 585618 / 4511365 are UTM easting/northing, not degrees.
function getProjDef(geoKeys) {
  const epsg = geoKeys?.ProjectedCSTypeGeoKey || geoKeys?.GeographicTypeGeoKey;

  if (!epsg || epsg === 4326) {
    return null; // already geographic WGS84, no reprojection needed
  }

  if (epsg >= 32601 && epsg <= 32660) {
    const zone = epsg - 32600;
    return `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;
  }

  if (epsg >= 32701 && epsg <= 32760) {
    const zone = epsg - 32700;
    return `+proj=utm +zone=${zone} +south +datum=WGS84 +units=m +no_defs`;
  }

  throw new Error(`Unsupported raster CRS (EPSG:${epsg})`);
}

// lat/lng (WGS84 degrees) -> raster CRS coordinates (e.g. UTM meters)
function toRasterCoords(lat, lng, geoKeys) {
  const def = getProjDef(geoKeys);
  if (!def) return { x: lng, y: lat };
  const [x, y] = proj4("EPSG:4326", def, [lng, lat]);
  return { x, y };
}

// raster CRS coordinates -> lat/lng (WGS84 degrees)
function fromRasterCoords(x, y, geoKeys) {
  const def = getProjDef(geoKeys);
  if (!def) return { lat: y, lng: x };
  const [lng, lat] = proj4(def, "EPSG:4326", [x, y]);
  return { lat, lng };
}

function latLngToPixel(lat, lng, bbox, width, height, geoKeys) {
  const [minX, minY, maxX, maxY] = bbox;
  const { x: rx, y: ry } = toRasterCoords(lat, lng, geoKeys);

  const x = Math.floor(((rx - minX) / (maxX - minX)) * width);
  const y = Math.floor(((maxY - ry) / (maxY - minY)) * height);

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

function metersToLatLngDelta(lat, radiusMeters) {
  const latDelta = radiusMeters / 111320;
  const lngDelta = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));

  return { latDelta, lngDelta };
}

// bounds is in lat/lng degrees; bbox is in the raster's CRS (Coordinate Reference System) (e.g. UTM meters (Universal Transverse Mercator)).
// Reproject the bounds corners into the raster CRS before computing pixel indices.
function latLngBoundsToPixelWindow(bounds, bbox, width, height, geoKeys) {
  const [minX, minY, maxX, maxY] = bbox;

  const nw = toRasterCoords(bounds.north, bounds.west, geoKeys);
  const se = toRasterCoords(bounds.south, bounds.east, geoKeys);

  const rasterWest = Math.min(nw.x, se.x);
  const rasterEast = Math.max(nw.x, se.x);
  const rasterNorth = Math.max(nw.y, se.y);
  const rasterSouth = Math.min(nw.y, se.y);

  const xMin = Math.floor(((rasterWest - minX) / (maxX - minX)) * width);
  const xMax = Math.ceil(((rasterEast - minX) / (maxX - minX)) * width);
  const yMin = Math.floor(((maxY - rasterNorth) / (maxY - minY)) * height);
  const yMax = Math.ceil(((maxY - rasterSouth) / (maxY - minY)) * height);

  return {
    xMin: Math.max(0, Math.min(width - 1, xMin)),
    xMax: Math.max(1, Math.min(width, xMax)),
    yMin: Math.max(0, Math.min(height - 1, yMin)),
    yMax: Math.max(1, Math.min(height, yMax)),
  };
}

function cropRasterByPixelWindow(rasterBand, width, height, window) {
  const cropWidth = window.xMax - window.xMin;
  const cropHeight = window.yMax - window.yMin;

  const cropped = new Float32Array(cropWidth * cropHeight);

  for (let y = 0; y < cropHeight; y++) {
    for (let x = 0; x < cropWidth; x++) {
      const sourceX = window.xMin + x;
      const sourceY = window.yMin + y;
      const sourceIdx = sourceY * width + sourceX;
      const targetIdx = y * cropWidth + x;
      cropped[targetIdx] = rasterBand[sourceIdx];
    }
  }

  return {
    pixels: cropped,
    width: cropWidth,
    height: cropHeight,
  };
}

// Convert a pixel window back into real lat/lng bounds for the GroundOverlay.
function pixelWindowToLatLngBounds(window, bbox, width, height, geoKeys) {
  const [minX, minY, maxX, maxY] = bbox;

  const rasterWest = minX + (window.xMin / width) * (maxX - minX);
  const rasterEast = minX + (window.xMax / width) * (maxX - minX);
  const rasterNorth = maxY - (window.yMin / height) * (maxY - minY);
  const rasterSouth = maxY - (window.yMax / height) * (maxY - minY);

  const nw = fromRasterCoords(rasterWest, rasterNorth, geoKeys);
  const se = fromRasterCoords(rasterEast, rasterSouth, geoKeys);

  return {
    north: nw.lat,
    south: se.lat,
    east: se.lng,
    west: nw.lng,
  };
}

module.exports = {
  fetchGeoTiff,
  latLngToPixel,
  pixelIndex,
  getBandValue,
  decodeShadeValue,
  monthIndexFromOneBased,
  getMonthlyFluxValue,
  metersToLatLngDelta,
  latLngBoundsToPixelWindow,
  cropRasterByPixelWindow,
  pixelWindowToLatLngBounds,
};