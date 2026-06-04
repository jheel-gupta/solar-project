import { useState } from "react";
import { LoadScript } from "@react-google-maps/api";

import SearchBox from "./components/SearchBox";
import SolarInfoCard from "./components/SolarInfoCard";
import MapView from "./components/MapView";
import SideBar from './components/SideBar';
import LoadingSpinner from "./components/LoadingSpinner";

import { fetchSolarData } from "./services/solarApi";
import { fetchLayers } from "./services/layersAPI";

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629,
};

const libraries = ["places"];


function App() {
  const [map, setMap] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(defaultCenter);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [solarData, setSolarData] = useState(null);
  const [solarPanels, setSolarPanels] = useState([]);
  const [showPanels, setShowPanels] = useState(false);
  const [roofPolygon, setRoofPolygon] = useState([]);
  const [layersData, setLayersData] = useState(null);

  console.log(showPanels);

  const onPlaceChanged = async () => {
    if (!autocomplete || !map) return;

    const place = autocomplete.getPlace();

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    const newLocation = { lat, lng };

    setSelectedLocation(newLocation);

    try {
      setLoading(true);
      setError("");

      const data = await fetchSolarData(lat, lng);
      const layers = await fetchLayers(lat,lng);
      console.log("LAYERS OBJECT: ");
      console.log(layers);

      console.log(JSON.stringify(layers,null,2));

      console.log("Solar Data:", data);

      setLayersData(layers);
      
      console.log(data.solarPotential);
      console.log(data.solarPotential.solarPanels);
      console.log(data.solarPotential.solarPanels[0]);
      console.log(
        "Panel Count:",
        data.solarPotential.solarPanels.length
      );

      setLoading(false);
      setSolarData(data);

      setSolarPanels(
        data.solarPotential.solarPanels
      );
    } catch (error) {
      console.log(error);
      setError("Failed to load solar data");
    }

    map.panTo(newLocation);
    map.setZoom(20);
  };

  const handleMarkerDrag = async (event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    console.log(event)
    console.log("Dragged:", lat, lng);

    const newLocation = {lat , lng};
    setSelectedLocation(newLocation);

    if(map) map.panTo(newLocation)

    try {
      setLoading(true);
      setError("");

      const response = await fetchSolarData(lat,lng);
      setSolarData(response);

      setSolarPanels(response.solarPotential.solarPanels);

      setLoading(false);
    } catch (error) {
      console.log(error);
      setError("Failed to load solar data");
    }
  };

  return (
    <LoadScript
      googleMapsApiKey={
        import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      }
      libraries={libraries}
    >
    <SideBar>
      <SearchBox
        onLoadAutocomplete={setAutocomplete}
        onPlaceChanged={onPlaceChanged}
      />

      <div style={{ marginTop: "20px"}}>
        <label>
          <input 
            type="checkbox"
            checked={showPanels}
            onChange={() => 
              setShowPanels(prev => !prev)
            }
            />
            
            Show Panels
        </label>
      </div>

      {loading && (
        <LoadingSpinner />
      )}
    {error && (
      <p>{error}</p>
    )}

      <SolarInfoCard solarData={solarData} />

    </SideBar>

      <MapView
        selectedLocation={selectedLocation}
        onLoadMap={setMap}
        onMarkerDragEnd = {handleMarkerDrag}
        roofPolygon={roofPolygon}
        solarData={solarData}
        showPanels={showPanels}
      />
    </LoadScript>
  );
}

export default App;