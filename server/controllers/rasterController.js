const {
  fetchGeoTiff,
  latLngToPixel,
  getBandValue,
  decodeShadeValue,
  monthIndexFromOneBased,
  getMonthlyFluxValue,
} = require("../utils/rasterUtils");

const axios = require("axios");

async function getLayersMeta(lat, lng) {
  const response = await axios.get(
    "https://solar.googleapis.com/v1/dataLayers:get",
    {
      params: {
        "location.latitude": lat,
        "location.longitude": lng,
        radiusMeters: 100,
        view: "FULL_LAYERS",
        key: process.env.SOLAR_API_KEY,
      },
    }
  );

  return response.data;
}

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

    const fluxPixel = latLngToPixel(
      Number(lat),
      Number(lng),
      fluxData.bbox,
      fluxData.width,
      fluxData.height
    );

    const maskPixel = latLngToPixel(
      Number(lat),
      Number(lng),
      maskData.bbox,
      maskData.width,
      maskData.height
    );

    const flux = getBandValue(fluxData.rasters[0], fluxPixel.x, fluxPixel.y, fluxData.width);
    const roofMask = getBandValue(maskData.rasters[0], maskPixel.x, maskPixel.y, maskData.width);

    res.json({
      point: { lat: Number(lat), lng: Number(lng) },
      flux,
      isRoof: roofMask === 1,
    });
  } catch (error) {
    console.log("extractFluxAndMaskAtPoint error");
    console.log(error.response?.data || error.message);
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

    const monthlyFluxData = await fetchGeoTiff(
      layers.monthlyFluxUrl,
      process.env.SOLAR_API_KEY
    );

    const monthlyFluxPixel = latLngToPixel(
      Number(lat),
      Number(lng),
      monthlyFluxData.bbox,
      monthlyFluxData.width,
      monthlyFluxData.height
    );

    const monthlyFlux = getMonthlyFluxValue(
      monthlyFluxData,
      monthNumber,
      monthlyFluxPixel.x,
      monthlyFluxPixel.y
    );

    res.json({
      point: { lat: Number(lat), lng: Number(lng) },
      month: monthNumber,
      monthlyFlux: monthlyFlux === -9999 ? null : monthlyFlux,
    });
  } catch (error) {
    console.log("extractMonthlyFluxAtPoint error");
    console.log(error.response?.data || error.message);
    res.status(500).json({ error: "Failed to extract monthly flux" });
  }
};

const extractShadeAtPoint = async (req, res) => {
  try {
    const { lat, lng, month, day, hour } = req.query;

    if (!lat || !lng || !month || !day || hour === undefined) {
      return res.status(400).json({
        error: "lat, lng, month, day, hour are required",
      });
    }

    const layers = await getLayersMeta(lat, lng);
    const monthIdx = monthIndexFromOneBased(Number(month));
    const shadeUrl = layers.hourlyShadeUrls[monthIdx];

    const shadeData = await fetchGeoTiff(shadeUrl, process.env.SOLAR_API_KEY);

    const pixel = latLngToPixel(
      Number(lat),
      Number(lng),
      shadeData.bbox,
      shadeData.width,
      shadeData.height
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
    console.log("extractShadeAtPoint error");
    console.log(error.response?.data || error.message);
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

    const fluxPixel = latLngToPixel(Number(lat), Number(lng), fluxData.bbox, fluxData.width, fluxData.height);
    const maskPixel = latLngToPixel(Number(lat), Number(lng), maskData.bbox, maskData.width, maskData.height);
    const shadePixel = latLngToPixel(Number(lat), Number(lng), juneShadeData.bbox, juneShadeData.width, juneShadeData.height);

    const flux = getBandValue(fluxData.rasters[0], fluxPixel.x, fluxPixel.y, fluxData.width);
    const roofMask = getBandValue(maskData.rasters[0], maskPixel.x, maskPixel.y, maskData.width);

    let sunnyHours = 0; //the hours which are SUNNY 
    let checks = 0; //checks is the subset of those hours that are valid sunny/shaded readings

    for (let hour = 8; hour <= 16; hour++) {
      const packed = getBandValue(
        juneShadeData.rasters[hour],
        shadePixel.x,
        shadePixel.y,
        juneShadeData.width
      );

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
    console.log("extractPanelSuitabilityAtPoint error");
    console.log(error.response?.data || error.message);
    res.status(500).json({ error: "Failed to extract suitability data" });
  }
};

module.exports = {
  extractFluxAndMaskAtPoint,
  extractMonthlyFluxAtPoint,
  extractShadeAtPoint,
  extractPanelSuitabilityAtPoint,
};