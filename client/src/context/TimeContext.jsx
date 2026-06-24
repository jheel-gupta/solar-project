import { createContext, useContext, useState, useEffect } from "react";
import {
  fetchFluxMaskPoint,
  fetchShadePoint,
  fetchSuitabilityPoint,
} from "../services/rasterApi";
import { useLocation } from "./LocationContext";

const TimeContext = createContext(null);

export function TimeProvider({ children }) {
  const { selectedLocation } = useLocation();

  const [analysisLoading, setAnalysisLoading] = useState(false);

  const [timeState, setTimeState] = useState({
    month: 6,
    day: 15,
    hour: 12,
  });

  const [draftTime, setDraftTime] = useState({
    month: 6,
    day: 15,
    hour: 12,
  });

  const [analysisData, setAnalysisData] = useState({
    fluxMask: null,
    shade: null,
    suitability: null,
  });

  const handleApplyTime = () => {
    setTimeState(draftTime);
  };

  // Same effect that was in App.jsx — runs point analysis whenever the
  // location or the APPLIED time (not the draft slider value) changes.
  useEffect(() => {
    const runAnalysis = async () => {
      const lat = selectedLocation?.lat;
      const lng = selectedLocation?.lng;

      if (lat == null || lng == null) return;
      try {
        setAnalysisLoading(true);

        const [fluxMask, shade, suitability] = await Promise.all([
          fetchFluxMaskPoint(lat, lng),
          fetchShadePoint(
            lat,
            lng,
            timeState.month,
            timeState.day,
            timeState.hour
          ),
          fetchSuitabilityPoint(lat, lng, timeState.month, timeState.day),
        ]);

        setAnalysisData({ fluxMask, shade, suitability });

        console.log("Flux/Mask:", fluxMask);
        console.log("Shade:", shade);
        console.log("Suitability:", suitability);
      } catch (err) {
        console.error("Analysis error:", err);
      } finally {
        setAnalysisLoading(false);
      }
    };

    runAnalysis();
  }, [selectedLocation, timeState]);

  const value = {
    timeState,
    draftTime,
    setDraftTime,
    handleApplyTime,
    analysisLoading,
    analysisData,
  };

  return <TimeContext.Provider value={value}>{children}</TimeContext.Provider>;
}

export function useTime() {
  const context = useContext(TimeContext);
  if (!context) {
    throw new Error("useTime must be used within a TimeProvider");
  }
  return context;
}