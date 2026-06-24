const express = require("express");
const router = express.Router();
const {
  extractFluxAndMaskAtPoint,
  extractShadeAtPoint,
  extractPanelSuitabilityAtPoint,
  extractMonthlyFluxAtPoint,
  getMonthlyFluxOverlay,
  scorePanelsEndpoint,       // ← new
} = require("../controllers/rasterController");

// Existing endpoints
router.get("/flux-mask-point", extractFluxAndMaskAtPoint);
router.get("/shade-point", extractShadeAtPoint);
router.get("/suitability-point", extractPanelSuitabilityAtPoint);
router.get("/monthly-flux", extractMonthlyFluxAtPoint);
router.get("/monthly-flux-overlay", getMonthlyFluxOverlay);

// New: score and sort panels using Data Layers
// POST because we're sending a potentially large panels[] array in the body
router.post("/score-panels", scorePanelsEndpoint);

module.exports = router;