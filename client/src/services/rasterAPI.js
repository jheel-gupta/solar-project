import axios from "axios";

const BASE_URL = "http://localhost:3000/raster";

export const fetchFluxMaskPoint = async (lat, lng) => {
  const response = await axios.get(`${BASE_URL}/flux-mask-point`, {
    params: { lat, lng },
  });
  return response.data;
};

export const fetchMonthlyFlux = async (lat, lng, month) => {
  const response = await axios.get(`${BASE_URL}/monthly-flux`, {
    params: { lat, lng, month },
  });
  return response.data;
};

export const fetchShadePoint = async (lat, lng, month, day, hour) => {
  const response = await axios.get(`${BASE_URL}/shade-point`, {
    params: { lat, lng, month, day, hour },
  });
  return response.data;
};

export const fetchSuitabilityPoint = async (lat, lng, month, day) => {
  const response = await axios.get(`${BASE_URL}/suitability-point`, {
    params: { lat, lng, month, day },
  });
  return response.data;
};

export const fetchMonthlyFluxOverlay = async (
  lat,
  lng,
  month,
  radiusMeters = 45,
  maskRooftop = false
) => {
  const response = await axios.get(`${BASE_URL}/monthly-flux-overlay`, {
    params: { lat, lng, month, radiusMeters, maskRooftop },
  });
  return response.data;
};

/**
 * Score and sort Google's solarPanels[] using Data Layers rasters.
 *
 * @param {number}  lat
 * @param {number}  lng
 * @param {Array}   panels           - solarPotential.solarPanels from Building Insights
 * @param {object}  [options]
 * @param {number}  [options.month]           - 1–12 (default 6)
 * @param {number}  [options.day]             - 1–31 (default 15)
 * @param {number}  [options.minFluxThreshold] - reject panels below this annual flux
 * @param {boolean} [options.requireRoof]      - reject off-roof panels (default true)
 * @param {boolean} [options.includeShade]     - fetch shade raster (slower, default true)
 * @param {boolean} [options.includeMonthlyFlux] - fetch monthly flux raster (default true)
 *
 * @returns {{ panels: ScoredPanel[], stats: object }}
 */
export const fetchScoredPanels = async (lat, lng, panels, options = {}) => {
  const response = await axios.post(`${BASE_URL}/score-panels`, {
    lat,
    lng,
    panels,
    ...options,
  });
  return response.data;
};