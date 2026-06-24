/**
 * panelScoringUtils.js
 *
 * Scores each panel from Google's Building Insights solarPanels[]
 * against Data Layers raster data: annual flux, monthly flux, hourly shade.
 *
 * NOTE: Mask-based roof validation is intentionally excluded from rejection
 * logic while the mask calculation is under investigation. The mask value is
 * still read and attached to each panel's score object for informational
 * purposes only — it never causes a panel to be rejected.
 */

const {
  latLngToPixel,
  getBandValue,
  monthIndexFromOneBased,
  decodeShadeValue,
} = require("./rasterUtils");

function clampPixel(x, y, width, height) {
  return {
    x: Math.max(0, Math.min(width - 1, x)),
    y: Math.max(0, Math.min(height - 1, y)),
  };
}

function getPanelAnnualFlux(panel, fluxData) {
  if (!panel?.center || !fluxData) return null;

  const raw = latLngToPixel(
    panel.center.latitude,
    panel.center.longitude,
    fluxData.bbox,
    fluxData.width,
    fluxData.height,
    fluxData.geoKeys
  );
  const { x, y } = clampPixel(raw.x, raw.y, fluxData.width, fluxData.height);
  const value = getBandValue(fluxData.rasters[0], x, y, fluxData.width);

  return value === -9999 ? null : value;
}

/**
 * Reads the mask value at the panel's center pixel.
 * Returned as-is for informational purposes only — never used to reject.
 */
function getPanelMaskValue(panel, maskData) {
  if (!panel?.center || !maskData) return null;

  const raw = latLngToPixel(
    panel.center.latitude,
    panel.center.longitude,
    maskData.bbox,
    maskData.width,
    maskData.height,
    maskData.geoKeys
  );
  const { x, y } = clampPixel(raw.x, raw.y, maskData.width, maskData.height);
  return getBandValue(maskData.rasters[0], x, y, maskData.width);
}

function getPanelMonthlyFlux(panel, monthlyFluxData, month) {
  if (!panel?.center || !monthlyFluxData) return null;

  const monthIdx = monthIndexFromOneBased(month);
  const band = monthlyFluxData.rasters[monthIdx];
  if (!band) return null;

  const raw = latLngToPixel(
    panel.center.latitude,
    panel.center.longitude,
    monthlyFluxData.bbox,
    monthlyFluxData.width,
    monthlyFluxData.height,
    monthlyFluxData.geoKeys
  );
  const { x, y } = clampPixel(
    raw.x, raw.y,
    monthlyFluxData.width, monthlyFluxData.height
  );
  const value = getBandValue(band, x, y, monthlyFluxData.width);

  return value === -9999 ? null : value;
}

/**
 * Computes the fraction of hours 8–16 that are sunny for a panel
 * on the given month+day using the hourly shade raster.
 * Returns 0–1, or null if shade data is unavailable or all reads invalid.
 */
function getPanelSunFraction(panel, shadeData, day) {
  if (!panel?.center || !shadeData) return null;

  const raw = latLngToPixel(
    panel.center.latitude,
    panel.center.longitude,
    shadeData.bbox,
    shadeData.width,
    shadeData.height,
    shadeData.geoKeys
  );
  const { x, y } = clampPixel(raw.x, raw.y, shadeData.width, shadeData.height);

  let sunny = 0;
  let total = 0;

  for (let hour = 8; hour <= 16; hour++) {
    const band = shadeData.rasters[hour];
    if (!band) continue;

    const packed = getBandValue(band, x, y, shadeData.width);
    const isSunny = decodeShadeValue(packed, day);

    if (isSunny !== null) {
      total++;
      if (isSunny) sunny++;
    }
  }

  return total > 0 ? sunny / total : null;
}

/**
 * scorePanels()
 *
 * Scores and sorts Google's solarPanels[] using flux and shade data only.
 * Mask data is read for informational attachment but never drives rejection.
 *
 * Rejection criteria (flux-only, mask excluded):
 *   - annualFlux is null (nodata pixel) → rejected as "nodata"
 *   - annualFlux < minFluxThreshold     → rejected as "low-flux"
 *
 * Composite score formula:
 *   base = annualFlux
 *   if sunFraction available: base × (0.4 + 0.6 × sunFraction)
 *   if monthlyFlux available: × clamp(monthlyFlux / (annualFlux/12), 0.85, 1.15)
 *
 * @param {Array}  panels
 * @param {object} fluxData
 * @param {object} maskData          - read but not used for rejection
 * @param {object} [monthlyFluxData]
 * @param {object} [shadeData]
 * @param {object} [options]
 * @param {number} [options.month=6]
 * @param {number} [options.day=15]
 * @param {number} [options.minFluxThreshold=0]
 *
 * @returns {{ panels: Array, stats: object }}
 */
function scorePanels(
  panels,
  fluxData,
  maskData,
  monthlyFluxData = null,
  shadeData = null,
  options = {}
) {
  const {
    month = 6,
    day = 15,
    minFluxThreshold = 0,
  } = options;

  let rejectedNodata = 0;
  let rejectedFlux = 0;
  let totalAnnualFlux = 0;
  let validCount = 0;

  const scored = panels.map((panel, originalIndex) => {
    const annualFlux    = getPanelAnnualFlux(panel, fluxData);
    const maskValue     = getPanelMaskValue(panel, maskData);   // informational only
    const monthlyFlux   = monthlyFluxData
      ? getPanelMonthlyFlux(panel, monthlyFluxData, month)
      : null;
    const sunFraction   = shadeData
      ? getPanelSunFraction(panel, shadeData, day)
      : null;

    // ── Rejection: flux only, no mask ────────────────────────
    let rejected = false;
    let rejectReason = null;

    if (annualFlux === null) {
      rejected = true;
      rejectReason = "nodata";
      rejectedNodata++;
    } else if (annualFlux < minFluxThreshold) {
      rejected = true;
      rejectReason = "low-flux";
      rejectedFlux++;
    }

    // ── Composite score ───────────────────────────────────────
    let compositeScore = null;

    if (!rejected && annualFlux !== null) {
      compositeScore = annualFlux;

      if (sunFraction !== null) {
        // Full shade (sunFraction=0) → ×0.4 penalty
        // Full sun  (sunFraction=1) → ×1.0 (no change)
        compositeScore *= (0.4 + 0.6 * sunFraction);
      }

      if (monthlyFlux !== null) {
        const expectedMonthly = annualFlux / 12;
        const boost = expectedMonthly > 0
          ? monthlyFlux / expectedMonthly
          : 1;
        compositeScore *= Math.max(0.85, Math.min(1.15, boost));
      }

      totalAnnualFlux += annualFlux;
      validCount++;
    }

    return {
      ...panel,
      originalIndex,
      score: {
        annualFlux,
        monthlyFlux,
        sunFraction,
        maskValue,        // attached for debugging / future use, not for filtering
        composite: compositeScore,
        rejected,
        rejectReason,     // "nodata" | "low-flux" | null
      },
    };
  });

  // Sort: accepted panels by composite descending, rejected panels at tail
  const accepted = scored
    .filter((p) => !p.score.rejected)
    .sort((a, b) => (b.score.composite ?? 0) - (a.score.composite ?? 0));

  const rejected = scored.filter((p) => p.score.rejected);

  const stats = {
    total: panels.length,
    accepted: accepted.length,
    rejectedNodata,
    rejectedFlux,
    avgAnnualFlux:
      validCount > 0 ? totalAnnualFlux / validCount : null,
    topFlux:    accepted[0]?.score.annualFlux ?? null,
    bottomFlux: accepted[accepted.length - 1]?.score.annualFlux ?? null,
  };

  return { panels: [...accepted, ...rejected], stats };
}

module.exports = {
  scorePanels,
  getPanelAnnualFlux,
  getPanelMaskValue,
  getPanelMonthlyFlux,
  getPanelSunFraction,
};