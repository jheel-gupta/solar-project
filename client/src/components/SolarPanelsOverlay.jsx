import { useMemo } from "react";
import { Polygon } from "@react-google-maps/api";
import { useSolarData } from "../context/SolarDataContext";

// ─────────────────────────────────────────────────────────────
// Geometry helpers (unchanged from original)
// ─────────────────────────────────────────────────────────────

function offsetLatLng(lat, lng, distanceMeters, headingDegrees) {
  const R = 6378137;
  const brng = (headingDegrees * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceMeters / R) +
      Math.cos(lat1) * Math.sin(distanceMeters / R) * Math.cos(brng)
  );

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(distanceMeters / R) * Math.cos(lat1),
      Math.cos(distanceMeters / R) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lng2 * 180) / Math.PI,
  };
}

function buildPanelPolygon(panel, solarPotential) {
  const segment = solarPotential?.roofSegmentStats?.[panel.segmentIndex];
  if (!segment || !panel?.center) return null;

  const azimuth = segment.azimuthDegrees ?? 0;
  const panelHeight = solarPotential.panelHeightMeters ?? 1.879;
  const panelWidth = solarPotential.panelWidthMeters ?? 1.045;

  const isPortrait = panel.orientation === "PORTRAIT";
  const longHeading = isPortrait ? azimuth + 90 : azimuth;
  const longHalf = (isPortrait ? panelHeight : panelWidth) / 2;
  const shortHalf = (isPortrait ? panelWidth : panelHeight) / 2;

  const centerLat = panel.center.latitude;
  const centerLng = panel.center.longitude;

  const topMid    = offsetLatLng(centerLat, centerLng, longHalf, longHeading);
  const bottomMid = offsetLatLng(centerLat, centerLng, longHalf, longHeading + 180);
  const topLeft   = offsetLatLng(topMid.lat, topMid.lng, shortHalf, longHeading - 90);
  const topRight  = offsetLatLng(topMid.lat, topMid.lng, shortHalf, longHeading + 90);
  const bottomRight = offsetLatLng(bottomMid.lat, bottomMid.lng, shortHalf, longHeading + 90);
  const bottomLeft  = offsetLatLng(bottomMid.lat, bottomMid.lng, shortHalf, longHeading - 90);

  return [topLeft, topRight, bottomRight, bottomLeft];
}

// ─────────────────────────────────────────────────────────────
// Color helpers — map score to a visible colour
// ─────────────────────────────────────────────────────────────

/**
 * Maps a normalised value 0–1 to a green→yellow→red gradient.
 * Returns a CSS hex colour string.
 *
 *  1.0 = best  → #22c55e (green)
 *  0.5 = mid   → #eab308 (amber)
 *  0.0 = worst → #ef4444 (red)
 */
function scoreToColor(t) {
  const clamped = Math.max(0, Math.min(1, t));

  if (clamped >= 0.5) {
    // green → yellow
    const f = (clamped - 0.5) * 2; // 0→1 within upper half
    const r = Math.round(34 + (234 - 34) * (1 - f));
    const g = Math.round(197 + (163 - 197) * (1 - f));
    const b = Math.round(94 + (8 - 94) * (1 - f));
    return `rgb(${r},${g},${b})`;
  } else {
    // yellow → red
    const f = clamped * 2; // 0→1 within lower half
    const r = Math.round(239 + (234 - 239) * f);
    const g = Math.round(68 + (163 - 68) * f);
    const b = Math.round(68 + (8 - 68) * f);
    return `rgb(${r},${g},${b})`;
  }
}

/**
 * Given the list of accepted (non-rejected) panels with composite scores,
 * compute min/max so we can normalise each panel's colour.
 */
function getScoreRange(panels) {
  let min = Infinity;
  let max = -Infinity;

  for (const p of panels) {
    const s = p.score?.composite;
    if (s != null && !p.score?.rejected) {
      if (s < min) min = s;
      if (s > max) max = s;
    }
  }

  return Number.isFinite(min) ? { min, max } : null;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

function SolarPanelsOverlay({ zoom = 20 }) {
  const {
    solarData,
    selectedConfigIndex,
    useSmartPlacement,
    scoredPanels,
  } = useSolarData();

  const solarPotential = solarData?.solarPotential;
  const configs = solarPotential?.solarPanelConfigs || [];

  const safeConfigIndex =
    configs.length === 0 ? 0 : Math.min(selectedConfigIndex, configs.length - 1);

  const selectedConfig = configs[safeConfigIndex];

  /**
   * Decide which panels to render and in which order.
   *
   * Smart placement ON  → use scoredPanels[] (sorted best-first by our scorer),
   *                        still respect the panel count from the selected config.
   * Smart placement OFF → fall back to Google's original solarPanels[] slice.
   */
  const panelsToRender = useMemo(() => {
    if (!selectedConfig) return [];

    const count = selectedConfig.panelsCount;

    if (useSmartPlacement && scoredPanels?.length) {
      // Slice the top N accepted panels from our sorted list.
      // Rejected panels are at the tail, so slicing by count is safe.
      return scoredPanels.slice(0, count);
    }

    // Default: Google's ordering
    const rawPanels = solarPotential?.solarPanels || [];
    return rawPanels.slice(0, count);
  }, [solarPotential, selectedConfig, useSmartPlacement, scoredPanels]);

  // Pre-compute score range for colour normalisation (only used in smart mode)
  const scoreRange = useMemo(() => {
    if (!useSmartPlacement || !scoredPanels) return null;
    return getScoreRange(scoredPanels);
  }, [useSmartPlacement, scoredPanels]);

  // Build polygon paths + per-panel colour
  const panelPolygons = useMemo(() => {
    return panelsToRender
      .map((panel, index) => {
        const path = buildPanelPolygon(panel, solarPotential);
        if (!path) return null;

        // Determine colour
        let fillColor = "#2563eb";   // default blue (Google mode)
        let fillOpacity = 0.72;

        if (useSmartPlacement && panel.score) {
          if (panel.score.rejected) {
            // Should not be visible (past the slice), but guard anyway
            fillColor = "#6b7280";
            fillOpacity = 0.3;
          } else if (scoreRange && panel.score.composite != null) {
            const t =
              scoreRange.max > scoreRange.min
                ? (panel.score.composite - scoreRange.min) /
                  (scoreRange.max - scoreRange.min)
                : 1;
            fillColor = scoreToColor(t);
            fillOpacity = 0.75;
          }
        }

        return {
          key: `${panel.segmentIndex}-${index}`,
          path,
          fillColor,
          fillOpacity,
          // Attach score for potential future tooltip use
          score: panel.score ?? null,
        };
      })
      .filter(Boolean);
  }, [panelsToRender, solarPotential, useSmartPlacement, scoreRange]);

  if (!selectedConfig) return null;

  return (
    <>
      {panelPolygons.map((polygon) => (
        <Polygon
          key={polygon.key}
          paths={polygon.path}
          options={{
            fillColor: polygon.fillColor,
            fillOpacity: polygon.fillOpacity,
            strokeColor: "#1e3a8a",
            strokeOpacity: 0.9,
            strokeWeight: 0.7,
            clickable: false,
            zIndex: 10,
          }}
        />
      ))}
    </>
  );
}

export default SolarPanelsOverlay;