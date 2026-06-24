import { useState } from "react";
import { LoadScript } from "@react-google-maps/api";

import SearchBox from "./components/SearchBox";
import SolarInfoCard from "./components/SolarInfoCard";
import MapView from "./components/MapView";
import LoadingSpinner from "./components/LoadingSpinner";
import TimeControls from "./components/TimeControls";

import { AppProviders } from "./context/AppProviders";
import { useLocation } from "./context/LocationContext";
import { useSolarData } from "./context/SolarDataContext";

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629,
};

const libraries = ["places", "geometry"];

// AppContent exists separately from App() because hooks like useLocation()
// and useSolarData() can only be called BELOW <AppProviders>, not inside
// the same component that renders the providers.
function AppContent() {
  const [activePanel, setActivePanel] = useState("insights");

  const {
    map,
    setMap,
    autocomplete,
    setAutocomplete,
    selectedLocation,
    setSelectedLocation,
  } = useLocation();

  const { loading, error, showPanels, setShowPanels, loadBuildingData } =
    useSolarData();

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

  return (
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
          <SolarInfoCard onOpenTimeControls={() => setActivePanel("time")} />
        ) : (
          <TimeControls onBack={() => setActivePanel("insights")} />
        )}
      </div>

      <div style={{ flex: 1, height: "100%", position: "relative" }}>
        <MapView
          selectedLocation={selectedLocation}
          onLoadMap={setMap}
          onMarkerDragEnd={handleMarkerDrag}
        />
      </div>
    </div>
  );
}

function App() {
  return (
    <LoadScript
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
      libraries={libraries}
    >
      <AppProviders>
        <AppContent />
      </AppProviders>
    </LoadScript>
  );
}

export default App;