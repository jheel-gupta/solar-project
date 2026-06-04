const axios = require("axios");

const getLayers = async(req,res) => {
    try {
        const {lat,lng} = req.query;

        const response = await axios.get(
            "https://solar.googleapis.com/v1/dataLayers:get",
            {
                params: {
                    "location.latitude": lat,
                    "location.longitude":lng,
                    radiusMeters: 100,
                    view: "FULL_LAYERS",
                  //  pixelSizeMeters=0.5,
                    key: process.env.SOLAR_API_KEY,
                },
            }
        );
        res.json(response.data)
    } catch (error) {
        console.log("LAYERS ERROR:");
        console.log(error.response?.data || error.message);

        res.status(500).json({
            error: "Layers API failed",
        });
    }
}

module.exports = {getLayers};