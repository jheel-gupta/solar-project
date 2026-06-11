import { useEffect, useState } from "react";
import { LoadScript } from "@react-google-maps/api";

import SearchBox from "./components/SearchBox";
import SolarInfoCard from "./components/SolarInfoCard";
import MapView from "./components/MapView";
import SideBar from "./components/SideBar";
import LoadingSpinner from "./components/LoadingSpinner";
import TimeControls from "./components/TimeControls";

import { fetchSolarData } from "./services/solarApi";
import { fetchLayers } from "./services/layersAPI";

import {
  fetchFluxMaskPoint,
  fetchShadePoint,
  fetchSuitabilityPoint,
} from "./services/rasterApi";


const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629,
};

const libraries = ["places", "geometry"];

function App() {
  const [map, setMap] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(defaultCenter);
  const [loading, setLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState("");
  const [solarData, setSolarData] = useState(null);
  const [showPanels, setShowPanels] = useState(false);
  const [roofPolygon, setRoofPolygon] = useState([]);
  const [layersData, setLayersData] = useState(null);
  const [selectedConfigIndex, setSelectedConfigIndex] = useState(0);
  const [activePanel, setActivePanel] = useState("insights");

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

  useEffect(() => {
    const configs = solarData?.solarPotential?.solarPanelConfigs || [];
    if (configs.length > 0) {
      setSelectedConfigIndex(configs.length - 1);
    } else {
      setSelectedConfigIndex(0);
    }
  }, [solarData]);

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

  const onPlaceChanged = async () => {
    if (!autocomplete || !map) return;

    const place = autocomplete.getPlace();
    if (!place?.geometry?.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const newLocation = { lat, lng };

    setSelectedLocation(newLocation);

    map.panTo(newLocation);
    map.setZoom(20);

    await loadBuildingData(lat, lng);
  };

  const handleMarkerDrag = async (event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    const newLocation = { lat, lng };
    setSelectedLocation(newLocation);

    if (map) {
      map.panTo(newLocation);
    }

    await loadBuildingData(lat, lng);
  };

  const handleApplyTime = () => {
    setTimeState(draftTime);
  };

  useEffect(() => {
    const runAnalysis = async () => {
      const { lat, lng } = selectedLocation || {};
      if (!lat || !lng) return;

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

  return (
  <LoadScript
    googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
    libraries={libraries}
  >
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
        position: "relative",
        background: "#eef2f7",
      }}
    >
      <SearchBox
        onLoadAutocomplete={setAutocomplete}
        onPlaceChanged={onPlaceChanged}
      />

      <div
        style={{
          width: "320px",
          minWidth: "320px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          background: "#f7f9fc",
          overflowY: "auto",
          boxSizing: "border-box",
          borderRight: "1px solid #e5e7eb",
          zIndex: 2,
        }}
      >
        <div
          style={{
            marginTop: "70px",
            padding: "10px 12px",
            background: "#fff",
            borderRadius: "10px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
          }}
        >
          <label
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "#374151",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={showPanels}
              onChange={() => setShowPanels((prev) => !prev)}
            />
            Show Panels
          </label>
        </div>

        {loading && <LoadingSpinner />}
        {error && <p>{error}</p>}

        {activePanel === "insights" ? (
          <SolarInfoCard
            solarData={solarData}
            selectedConfigIndex={selectedConfigIndex}
            setSelectedConfigIndex={setSelectedConfigIndex}
            onOpenTimeControls={() => setActivePanel("time")}
          />
        ) : (
          <TimeControls
            draftTime={draftTime}
            setDraftTime={setDraftTime}
            onApply={handleApplyTime}
            loading={analysisLoading}
            onBack={() => setActivePanel("insights")}
          />
        )}
      </div>

      <div style={{ flex: 1, height: "100%", position: "relative" }}>
        <MapView
          selectedLocation={selectedLocation}
          onLoadMap={setMap}
          onMarkerDragEnd={handleMarkerDrag}
          roofPolygon={roofPolygon}
          solarData={solarData}
          showPanels={showPanels}
          selectedConfigIndex={selectedConfigIndex}
        />
      </div>
    </div>
  </LoadScript>
);
}

export default App;