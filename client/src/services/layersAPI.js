import axios from "axios";

export const fetchLayers = async (lat,lng) => {
    const response = await axios.get(`http://localhost:3000/layers?lat=${lat}&lng=${lng}`);

    return response.data;
}