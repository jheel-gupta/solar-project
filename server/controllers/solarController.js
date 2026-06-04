const axios = require("axios");

const getSolarData = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    const response = await axios.get(
      "https://solar.googleapis.com/v1/buildingInsights:findClosest",
      {
        params: {
          "location.latitude": lat,
          "location.longitude": lng,
          key: process.env.SOLAR_API_KEY,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.log(error.response?.data || error.message);

    res.status(500).json({
      error: "Solar API failed",
    });
  }
};

module.exports = {
  getSolarData,
};