const axios = require("axios");

const getFlux = async (req, res) => {
  try {
    const { url } = req.query;

    const response = await axios.get(url, {
      params: {
        key: process.env.SOLAR_API_KEY,
      },
      responseType: "arraybuffer",
    });

    res.setHeader(
      "Content-Type",
      "image/tiff"
    );


    const fs = require("fs");
    fs.writeFileSync(
        "flux.tif",
        response.data
    );

    res.send(response.data);

  } catch (error) {
    console.log(
      error.response?.data ||
      error.message
    );

    res.status(500).json({
      error: "Failed to fetch flux layer",
    });
  }
};

module.exports = {
  getFlux,
};