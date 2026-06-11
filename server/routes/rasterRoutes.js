const express = require("express");
const router = express.Router();
const {
  extractFluxAndMaskAtPoint,
  extractShadeAtPoint,
  extractPanelSuitabilityAtPoint,
  extractMonthlyFluxAtPoint,
} = require("../controllers/rasterController");

router.get("/flux-mask-point", extractFluxAndMaskAtPoint);
router.get("/shade-point", extractShadeAtPoint);
router.get("/suitability-point", extractPanelSuitabilityAtPoint);
router.get("/monthly-flux", extractMonthlyFluxAtPoint);

module.exports = router;