import axios from "axios";

export const fetchSolarData = async (lat, lng) => {
  const response = await axios.get(
    `http://localhost:3000/solar?lat=${lat}&lng=${lng}`
  );
  return response.data;
};