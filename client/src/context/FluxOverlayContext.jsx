import { createContext, useContext, useState, useEffect } from "react";
import { fetchMonthlyFluxOverlay } from "../services/rasterApi";
import { useLocation } from "./LocationContext";
import { useTime } from "./TimeContext";

const FluxOverlayContext = createContext(null);

function getOverlayOpacityFromFlux(overlay) {
  if (!overlay) return 0.55;

  const { minFlux, maxFlux } = overlay;

  if (
    minFlux == null ||
    maxFlux == null ||
    Number.isNaN(minFlux) ||
    Number.isNaN(maxFlux)
  ) {
    return 0.55;
  }

  const spread = Math.max(0, maxFlux - minFlux);

  // Normalize spread into a practical visual range.
  const normalized = Math.min(1, spread / 80);

  // Keep overlay always visible but not too strong.
  return 0.35 + normalized * 0.5; // range roughly 0.35 to 0.85
}

export function FluxOverlayProvider({ children }) {
  const { selectedLocation } = useLocation();
  const { draftTime } = useTime(); // depends on TimeContext — must be nested inside TimeProvider

  const [monthlyFluxOverlay, setMonthlyFluxOverlay] = useState(null);
  const [showFluxOverlay, setShowFluxOverlay] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.55);
  const [maskRooftop, setMaskRooftop] = useState(false);

  // Same effect that was in App.jsx — fetches a new overlay whenever
  // location, month, the flux toggle, or the mask toggle changes.
  useEffect(() => {
    const loadMonthlyOverlay = async () => {
      const lat = selectedLocation?.lat;
      const lng = selectedLocation?.lng;

      if (lat == null || lng == null) return;

      if (!showFluxOverlay) {
        setMonthlyFluxOverlay(null);
        return;
      }

      try {
        const overlay = await fetchMonthlyFluxOverlay(
          lat,
          lng,
          draftTime.month,
          45,
          maskRooftop
        );

        setMonthlyFluxOverlay(overlay);
        setOverlayOpacity(getOverlayOpacityFromFlux(overlay));
        console.log("Monthly flux overlay:", overlay);
      } catch (err) {
        console.error("Monthly overlay error:", err);
        setMonthlyFluxOverlay(null);
      }
    };

    loadMonthlyOverlay();
  }, [selectedLocation, draftTime.month, showFluxOverlay, maskRooftop]);

  const value = {
    monthlyFluxOverlay,
    showFluxOverlay,
    setShowFluxOverlay,
    overlayOpacity,
    maskRooftop,
    setMaskRooftop,
  };

  return (
    <FluxOverlayContext.Provider value={value}>
      {children}
    </FluxOverlayContext.Provider>
  );
}

export function useFluxOverlay() {
  const context = useContext(FluxOverlayContext);
  if (!context) {
    throw new Error("useFluxOverlay must be used within a FluxOverlayProvider");
  }
  return context;
}