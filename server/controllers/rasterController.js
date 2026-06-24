/**
 * rasterController.js
 *
 * All existing endpoints are unchanged.
 * New endpoint: scorePanels — accepts Google's solarPanels[] in the request
 * body and returns them enriched with Data Layers scores, sorted best-first.
 */

const {
  fetchGeoTiff,
  latLngToPixel,
  getBandValue,
  decodeShadeValue,
  monthIndexFromOneBased,
  getMonthlyFluxValue,
  metersToLatLngDelta,
  latLngBoundsToPixelWindow,
  cropRasterByPixelWindow,
  pixelWindowToLatLngBounds,
} = require("../utils/rasterUtils");

const { scorePanels } = require("../utils/panelScoringUtils");

const { createMonthlyFluxOverlayPngBase64 } = require("../utils/pngOverlayUtils");

const axios = require("axios");

// ─────────────────────────────────────────────────────────────
// Internal helper — shared by all endpoints
// ─────────────────────────────────────────────────────────────

function expandPixelWindow(window, rasterWidth, rasterHeight, minSize = 20) {
  let { xMin, xMax, yMin, yMax } = window;

  let width = xMax - xMin + 1;
  let height = yMax - yMin + 1;

  if (width < minSize) {
    const extra = minSize - width;
    xMin -= Math.floor(extra / 2);
    xMax += Math.ceil(extra / 2);
  }

  if (height < minSize) {
    const extra = minSize - height;
    yMin -= Math.floor(extra / 2);
    yMax += Math.ceil(extra / 2);
  }

  xMin = Math.max(0, xMin);
  yMin = Math.max(0, yMin);
  xMax = Math.min(rasterWidth - 1, xMax);
  yMax = Math.min(rasterHeight - 1, yMax);

  return { xMin, xMax, yMin, yMax };
}

async function getLayersMeta(lat, lng, radiusMeters = 100) {
  try {
    console.log("getLayersMeta request:", { lat, lng, radiusMeters });

    const response = await axios.get(
      "https://solar.googleapis.com/v1/dataLayers:get",
      {
        params: {
          "location.latitude": lat,
          "location.longitude": lng,
          radiusMeters,
          view: "FULL_LAYERS",
          key: process.env.SOLAR_API_KEY,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.log("getLayersMeta error:", error.response?.data || error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
// NEW: Score and sort Google's panels using Data Layers
// ─────────────────────────────────────────────────────────────

/**
 * POST /raster/score-panels
 *
 * Body:
 * {
 *   lat: number,
 *   lng: number,
 *   panels: SolarPanel[],       // solarPotential.solarPanels from Building Insights
 *   month?: number,             // 1–12, default 6
 *   day?: number,               // 1–31, default 15
 *   minFluxThreshold?: number,  // kWh/kWp/year, default 0 (no rejection by flux)
 *   includeShade?: boolean,     // fetch shade raster for the chosen month (slower), default true
 *   includeMonthlyFlux?: boolean // fetch monthly flux raster, default true
 * }
 *
 * Returns:
 * {
 *   panels: ScoredPanel[],  // sorted best-first, each has .score{}
 *   stats: object           // summary stats
 * }
 */
const scorePanelsEndpoint = async (req, res) => {
  try {
    const {
      lat,
      lng,
      panels,
      month = 6,
      day = 15,
      minFluxThreshold = 0,
      includeShade = true,
      includeMonthlyFlux = true,
    } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: "lat and lng are required" });
    }

    if (!Array.isArray(panels) || panels.length === 0) {
      return res.status(400).json({ error: "panels array is required and must not be empty" });
    }

    const monthNum = Number(month);
    const dayNum = Number(day);

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: "month must be between 1 and 12" });
    }

    console.log(`scorePanels: scoring ${panels.length} panels at (${lat}, ${lng}), month=${monthNum}, day=${dayNum}`);

    const layers = await getLayersMeta(lat, lng);

    // Always fetch annual flux and mask — these are fast and always needed
    const fetches = [
      fetchGeoTiff(layers.annualFluxUrl, process.env.SOLAR_API_KEY),
      fetchGeoTiff(layers.maskUrl, process.env.SOLAR_API_KEY),
    ];

    // Optionally fetch monthly flux and shade (add latency but improve scoring)
    if (includeMonthlyFlux && layers.monthlyFluxUrl) {
      fetches.push(fetchGeoTiff(layers.monthlyFluxUrl, process.env.SOLAR_API_KEY));
    } else {
      fetches.push(Promise.resolve(null));
    }

    if (includeShade && layers.hourlyShadeUrls) {
      const monthIdx = monthIndexFromOneBased(monthNum);
      const shadeUrl = layers.hourlyShadeUrls[monthIdx];
      fetches.push(shadeUrl
        ? fetchGeoTiff(shadeUrl, process.env.SOLAR_API_KEY)
        : Promise.resolve(null)
      );
    } else {
      fetches.push(Promise.resolve(null));
    }

    const [fluxData, maskData, monthlyFluxData, shadeData] = await Promise.all(fetches);

    const { panels: scoredPanels, stats } = scorePanels(
      panels,
      fluxData,
      maskData,
      monthlyFluxData,
      shadeData,
      {
        month: monthNum,
        day: dayNum,
        minFluxThreshold: Number(minFluxThreshold),
        // requireRoof excluded: mask validation temporarily out of scope
      }
    );

    console.log("scorePanels stats:", stats);

    res.json({ panels: scoredPanels, stats });
  } catch (error) {
    console.log("scorePanels error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to score panels" });
  }
};

// ─────────────────────────────────────────────────────────────
// All existing endpoints — unchanged
// ─────────────────────────────────────────────────────────────

const extractFluxAndMaskAtPoint = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: "lat and lng are required" });
    }

    const layers = await getLayersMeta(lat, lng);

    const [fluxData, maskData] = await Promise.all([
      fetchGeoTiff(layers.annualFluxUrl, process.env.SOLAR_API_KEY),
      fetchGeoTiff(layers.maskUrl, process.env.SOLAR_API_KEY),
    ]);

    const fluxPixel = latLngToPixel(Number(lat), Number(lng), fluxData.bbox, fluxData.width, fluxData.height, fluxData.geoKeys);
    const maskPixel = latLngToPixel(Number(lat), Number(lng), maskData.bbox, maskData.width, maskData.height, maskData.geoKeys);

    const flux = getBandValue(fluxData.rasters[0], fluxPixel.x, fluxPixel.y, fluxData.width);
    const roofMask = getBandValue(maskData.rasters[0], maskPixel.x, maskPixel.y, maskData.width);

    res.json({
      point: { lat: Number(lat), lng: Number(lng) },
      flux,
      isRoof: roofMask === 1,
    });
  } catch (error) {
    console.log("extractFluxAndMaskAtPoint error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to extract flux/mask" });
  }
};

const extractMonthlyFluxAtPoint = async (req, res) => {
  try {
    const { lat, lng, month } = req.query;

    if (!lat || !lng || !month) {
      return res.status(400).json({ error: "lat, lng and month are required" });
    }

    const monthNumber = Number(month);
    if (monthNumber < 1 || monthNumber > 12) {
      return res.status(400).json({ error: "month must be between 1 and 12" });
    }

    const layers = await getLayersMeta(lat, lng);
    const monthlyFluxData = await fetchGeoTiff(layers.monthlyFluxUrl, process.env.SOLAR_API_KEY);

    const monthlyFluxPixel = latLngToPixel(
      Number(lat), Number(lng),
      monthlyFluxData.bbox, monthlyFluxData.width, monthlyFluxData.height, monthlyFluxData.geoKeys
    );

    const monthlyFlux = getMonthlyFluxValue(monthlyFluxData, monthNumber, monthlyFluxPixel.x, monthlyFluxPixel.y);

    res.json({
      point: { lat: Number(lat), lng: Number(lng) },
      month: monthNumber,
      monthlyFlux: monthlyFlux === -9999 ? null : monthlyFlux,
    });
  } catch (error) {
    console.log("extractMonthlyFluxAtPoint error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to extract monthly flux" });
  }
};

const getMonthlyFluxOverlay = async (req, res) => {
  try {
    const { lat, lng, month, radiusMeters = 45, maskRooftop = "false" } = req.query;

    if (!lat || !lng || !month) {
      return res.status(400).json({ error: "lat, lng and month are required" });
    }

    const latNum = Number(lat);
    const lngNum = Number(lng);
    const monthNum = Number(month);
    const radiusNum = Number(radiusMeters);
    const shouldMask = maskRooftop === "true";

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: "month must be between 1 and 12" });
    }
    if (radiusNum <= 0 || radiusNum > 175) {
      return res.status(400).json({ error: "radiusMeters must be between 1 and 175" });
    }

    const layers = await getLayersMeta(latNum, lngNum, radiusNum);

    if (!layers.monthlyFluxUrl) {
      return res.status(400).json({ error: "monthlyFluxUrl not available for this location" });
    }

    const fetches = [fetchGeoTiff(layers.monthlyFluxUrl, process.env.SOLAR_API_KEY)];
    if (shouldMask) {
      fetches.push(fetchGeoTiff(layers.maskUrl, process.env.SOLAR_API_KEY));
    }

    const [monthlyFluxData, maskData] = await Promise.all(fetches);

    const band = monthlyFluxData.rasters[monthIndexFromOneBased(monthNum)];
    if (!band) {
      return res.status(500).json({ error: "Monthly flux band not found" });
    }

    const { latDelta, lngDelta } = metersToLatLngDelta(latNum, radiusNum);
    const requestedBounds = {
      north: latNum + latDelta,
      south: latNum - latDelta,
      east: lngNum + lngDelta,
      west: lngNum - lngDelta,
    };

    const pixelWindow = latLngBoundsToPixelWindow(
      requestedBounds, monthlyFluxData.bbox,
      monthlyFluxData.width, monthlyFluxData.height, monthlyFluxData.geoKeys
    );
    const expandedWindow = expandPixelWindow(pixelWindow, monthlyFluxData.width, monthlyFluxData.height, 20);
    const cropped = cropRasterByPixelWindow(band, monthlyFluxData.width, monthlyFluxData.height, expandedWindow);

    let croppedMask = null;
    let croppedMaskResult = null;

    if (shouldMask && maskData) {
      const maskPixelWindow = latLngBoundsToPixelWindow(
        requestedBounds, maskData.bbox,
        maskData.width, maskData.height, maskData.geoKeys
      );
      const expandedMaskWindow = expandPixelWindow(maskPixelWindow, maskData.width, maskData.height, 20);
      croppedMaskResult = cropRasterByPixelWindow(
        maskData.rasters[0], maskData.width, maskData.height, expandedMaskWindow
      );
      croppedMask = croppedMaskResult.pixels;
    }

    const overlayBounds = pixelWindowToLatLngBounds(
      expandedWindow, monthlyFluxData.bbox,
      monthlyFluxData.width, monthlyFluxData.height, monthlyFluxData.geoKeys
    );

    const { imageUrl, minFlux, maxFlux } = createMonthlyFluxOverlayPngBase64(
      cropped.pixels, cropped.width, cropped.height,
      croppedMask, croppedMaskResult?.width, croppedMaskResult?.height
    );

    res.json({
      point: { lat: latNum, lng: lngNum },
      month: monthNum,
      radiusMeters: radiusNum,
      imageUrl,
      bounds: overlayBounds,
      width: cropped.width,
      height: cropped.height,
      minFlux,
      maxFlux,
    });
  } catch (error) {
    console.log("getMonthlyFluxOverlay error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to generate monthly flux overlay" });
  }
};

const extractShadeAtPoint = async (req, res) => {
  try {
    const { lat, lng, month, day, hour } = req.query;

    if (!lat || !lng || !month || !day || hour === undefined) {
      return res.status(400).json({ error: "lat, lng, month, day, hour are required" });
    }

    const layers = await getLayersMeta(lat, lng);
    const monthIdx = monthIndexFromOneBased(Number(month));
    const shadeUrl = layers.hourlyShadeUrls[monthIdx];

    const shadeData = await fetchGeoTiff(shadeUrl, process.env.SOLAR_API_KEY);
    const pixel = latLngToPixel(
      Number(lat), Number(lng),
      shadeData.bbox, shadeData.width, shadeData.height, shadeData.geoKeys
    );

    const hourBand = shadeData.rasters[Number(hour)];
    const packedValue = getBandValue(hourBand, pixel.x, pixel.y, shadeData.width);
    const sunny = decodeShadeValue(packedValue, Number(day));

    res.json({
      point: { lat: Number(lat), lng: Number(lng) },
      month: Number(month),
      day: Number(day),
      hour: Number(hour),
      sunny,
      shaded: sunny === null ? null : !sunny,
      packedValue,
    });
  } catch (error) {
    console.log("extractShadeAtPoint error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to extract shade" });
  }
};

const extractPanelSuitabilityAtPoint = async (req, res) => {
  try {
    const { lat, lng, month = 6, day = 15 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: "lat and lng are required" });
    }

    const monthNumber = Number(month);
    const dayNumber = Number(day);

    const layers = await getLayersMeta(lat, lng);
    const monthIdx = monthIndexFromOneBased(monthNumber);

    const [fluxData, maskData, juneShadeData] = await Promise.all([
      fetchGeoTiff(layers.annualFluxUrl, process.env.SOLAR_API_KEY),
      fetchGeoTiff(layers.maskUrl, process.env.SOLAR_API_KEY),
      fetchGeoTiff(layers.hourlyShadeUrls[monthIdx], process.env.SOLAR_API_KEY),
    ]);

    const fluxPixel = latLngToPixel(Number(lat), Number(lng), fluxData.bbox, fluxData.width, fluxData.height, fluxData.geoKeys);
    const maskPixel = latLngToPixel(Number(lat), Number(lng), maskData.bbox, maskData.width, maskData.height, maskData.geoKeys);
    const shadePixel = latLngToPixel(Number(lat), Number(lng), juneShadeData.bbox, juneShadeData.width, juneShadeData.height, juneShadeData.geoKeys);

    const flux = getBandValue(fluxData.rasters[0], fluxPixel.x, fluxPixel.y, fluxData.width);
    const roofMask = getBandValue(maskData.rasters[0], maskPixel.x, maskPixel.y, maskData.width);

    let sunnyHours = 0;
    let checks = 0;

    for (let hour = 8; hour <= 16; hour++) {
      const packed = getBandValue(juneShadeData.rasters[hour], shadePixel.x, shadePixel.y, juneShadeData.width);
      const sunny = decodeShadeValue(packed, dayNumber);
      if (sunny !== null) {
        checks++;
        if (sunny) sunnyHours++;
      }
    }

    const sunAvailability = checks > 0 ? sunnyHours / checks : 0;
    const validFlux = flux === -9999 ? null : flux;
    const isRoof = roofMask === 1;

    let suitabilityScore = 0;
    if (isRoof && validFlux !== null) {
      suitabilityScore = validFlux * sunAvailability;
    }

    res.json({
      point: { lat: Number(lat), lng: Number(lng) },
      month: monthNumber,
      day: dayNumber,
      flux: validFlux,
      isRoof,
      june15SunAvailability_8to16: sunAvailability,
      suitabilityScore,
    });
  } catch (error) {
    console.log("extractPanelSuitabilityAtPoint error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to extract suitability data" });
  }
};

module.exports = {
  extractFluxAndMaskAtPoint,
  extractMonthlyFluxAtPoint,
  getMonthlyFluxOverlay,
  extractShadeAtPoint,
  extractPanelSuitabilityAtPoint,
  scorePanelsEndpoint,        // ← new
};