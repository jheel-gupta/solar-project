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