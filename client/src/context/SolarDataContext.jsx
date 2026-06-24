import { createContext, useContext, useState, useEffect } from "react";
import { fetchSolarData } from "../services/solarApi";
import { fetchLayers } from "../services/layersAPI";
import { fetchScoredPanels } from "../services/rasterApi";

const SolarDataContext = createContext(null);

export function SolarDataProvider({ children }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [solarData, setSolarData] = useState(null);
  const [layersData, setLayersData] = useState(null);
  const [showPanels, setShowPanels] = useState(false);
  const [roofPolygon, setRoofPolygon] = useState([]);
  const [selectedConfigIndex, setSelectedConfigIndex] = useState(0);

  // Smart placement state
  const [useSmartPlacement, setUseSmartPlacement] = useState(false);
  const [scoredPanels, setScoredPanels] = useState(null);   // enriched + sorted panels
  const [scoringStats, setScoringStats] = useState(null);   // summary from the scorer
  const [scoringLoading, setScoringLoading] = useState(false);
  const [scoringError, setScoringError] = useState("");

  // Auto-select the max-panel config when new data loads
  useEffect(() => {
    const configs = solarData?.solarPotential?.solarPanelConfigs || [];
    if (configs.length > 0) {
      setSelectedConfigIndex(configs.length - 1);
    } else {
      setSelectedConfigIndex(0);
    }

    // Clear any previous scoring results when location changes
    setScoredPanels(null);
    setScoringStats(null);
    setScoringError("");
  }, [solarData]);

  /**
   * Fetch solar + layers data for a new location.
   * Called from App.jsx when a place is searched or marker is dragged.
   */
  const loadBuildingData = async (lat, lng) => {
    try {
      setLoading(true);
      setError("");

      const [data, layers] = await Promise.all([
        fetchSolarData(lat, lng),
        fetchLayers(lat, lng),
      ]);

      setSolarData(data);
      setLayersData(layers);

      console.log("Solar Data:", data);
      console.log("Layers Data:", layers);
    } catch (err) {
      console.error(err);
      setError("Failed to load solar data");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Score the current solarPanels[] using Data Layers.
   * Can be called explicitly (e.g., when the user toggles smart placement)
   * or automatically when solarData changes and useSmartPlacement is on.
   *
   * Options mirror the backend scorePanels endpoint:
   *   { month, day, minFluxThreshold, requireRoof, includeShade, includeMonthlyFlux }
   */
  const runPanelScoring = async (lat, lng, options = {}) => {
    const panels = solarData?.solarPotential?.solarPanels;

    if (!panels?.length) {
      setScoringError("No panels available to score");
      return;
    }

    try {
      setScoringLoading(true);
      setScoringError("");

      const { panels: ranked, stats } = await fetchScoredPanels(
        lat,
        lng,
        panels,
        options
      );

      setScoredPanels(ranked);
      setScoringStats(stats);

      console.log("Scored panels stats:", stats);
      console.log("Top 3 panels by score:", ranked.slice(0, 3).map((p) => p.score));
    } catch (err) {
      console.error("Panel scoring error:", err);
      setScoringError("Failed to score panels");
      setScoredPanels(null);
    } finally {
      setScoringLoading(false);
    }
  };

  const value = {
    // Original state
    loading,
    error,
    solarData,
    layersData,
    showPanels,
    setShowPanels,
    roofPolygon,
    setRoofPolygon,
    selectedConfigIndex,
    setSelectedConfigIndex,
    loadBuildingData,

    // Smart placement
    useSmartPlacement,
    setUseSmartPlacement,
    scoredPanels,
    scoringStats,
    scoringLoading,
    scoringError,
    runPanelScoring,
  };

  return (
    <SolarDataContext.Provider value={value}>
      {children}
    </SolarDataContext.Provider>
  );
}

export function useSolarData() {
  const context = useContext(SolarDataContext);
  if (!context) {
    throw new Error("useSolarData must be used within a SolarDataProvider");
  }
  return context;
}