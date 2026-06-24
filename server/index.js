const express = require("express");
const cors = require("cors");

require("dotenv").config();

const solarRoutes = require("./routes/solarRoutes");
const layersRoute = require("./routes/layersRoute");
const fluxRoutes = require("./routes/fluxRoutes");
const rasterRoutes = require("./routes/rasterRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/solar", solarRoutes);
app.use("/layers",layersRoute);
app.use("/flux", fluxRoutes);
app.use("/raster",rasterRoutes);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});