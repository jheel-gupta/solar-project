import { useEffect, useState } from "react";
import { LoadScript } from "@react-google-maps/api";

import SearchBox from "./components/SearchBox";
import SolarInfoCard from "./components/SolarInfoCard";
import MapView from "./components/MapView";
import SideBar from "./components/SideBar";
import LoadingSpinner from "./components/LoadingSpinner";

import { fetchSolarData } from "./services/solarApi";
import { fetchLayers } from "./services/layersAPI";

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
  const [error, setError] = useState("");
  const [solarData, setSolarData] = useState(null);
  const [showPanels, setShowPanels] = useState(false);
  const [roofPolygon, setRoofPolygon] = useState([]);
  const [layersData, setLayersData] = useState(null);
  const [selectedConfigIndex, setSelectedConfigIndex] = useState(0);

  useEffect(() => {
    const configs = solarData?.solarPotential?.solarPanelConfigs || [];
    if (configs.length > 0) {
      setSelectedConfigIndex(configs.length - 1);
    } else {
      setSelectedConfigIndex(0);
    }
  }, [solarData]);

  const onPlaceChanged = async () => {
    if (!autocomplete || !map) return;

    const place = autocomplete.getPlace();
    if (!place?.geometry?.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const newLocation = { lat, lng };

    setSelectedLocation(newLocation);

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

    map.panTo(newLocation);
    map.setZoom(20);
  };

  const handleMarkerDrag = async (event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    const newLocation = { lat, lng };
    setSelectedLocation(newLocation);

    if (map) {
      map.panTo(newLocation);
    }

    try {
      setLoading(true);
      setError("");

      const [data, layers] = await Promise.all([
        fetchSolarData(lat, lng),
        fetchLayers(lat, lng),
      ]);

      setSolarData(data);
      setLayersData(layers);

      console.log("Dragged Solar Data:", data);
      console.log("Dragged Layers Data:", layers);
    } catch (err) {
      console.error(err);
      setError("Failed to load solar data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoadScript
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
      libraries={libraries}
    >
      <SideBar>
        <SearchBox
          onLoadAutocomplete={setAutocomplete}
          onPlaceChanged={onPlaceChanged}
        />

        <div style={{ marginTop: "20px" }}>
          <label>
            <input
              type="checkbox"
              checked={showPanels}
              onChange={() => setShowPanels((prev) => !prev)}
            />{" "}
            Show Panels
          </label>
        </div>

        {loading && <LoadingSpinner />}
        {error && <p>{error}</p>}

        <SolarInfoCard
          solarData={solarData}
          selectedConfigIndex={selectedConfigIndex}
          setSelectedConfigIndex={setSelectedConfigIndex}
        />
      </SideBar>

      <MapView
        selectedLocation={selectedLocation}
        onLoadMap={setMap}
        onMarkerDragEnd={handleMarkerDrag}
        roofPolygon={roofPolygon}
        solarData={solarData}
        showPanels={showPanels}
        selectedConfigIndex={selectedConfigIndex}
      />
    </LoadScript>
  );
}

export default App;