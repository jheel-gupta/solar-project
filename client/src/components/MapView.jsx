import { useEffect, useState } from "react";
import { GoogleMap, Marker, Polygon } from "@react-google-maps/api";
import SolarPanelsOverlay from "./SolarPanelsOverlay";

const containerStyle = {
  width: "100vw",
  height: "100vh",
};

function MapView({
  selectedLocation,
  onLoadMap,
  onMarkerDragEnd,
  roofPolygon,
  solarData,
  showPanels,
  selectedConfigIndex,
}) {
  const [mapRef, setMapRef] = useState(null);
  const [zoom, setZoom] = useState(20);

  const handleLoad = (map) => {
    setMapRef(map);
    setZoom(map.getZoom() || 20);

    if (onLoadMap) {
      onLoadMap(map);
    }
  };

  useEffect(() => {
    if (!mapRef) return;
    if (selectedLocation) {
      mapRef.panTo(selectedLocation);
    }
  }, [mapRef, selectedLocation]);

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={selectedLocation}
      zoom={20}
      onLoad={handleLoad}
      onZoomChanged={() => {
        if (mapRef) {
          setZoom(mapRef.getZoom() || 20);
        }
      }}
      options={{
        mapTypeId: "satellite",
        tilt: 0,
        streetViewControl: false,
        fullscreenControl: false,
      }}
    >
      {showPanels && solarData?.solarPotential && (
        <SolarPanelsOverlay
          solarPotential={solarData.solarPotential}
          selectedConfigIndex={selectedConfigIndex}
          zoom={zoom}
        />
      )}

      {roofPolygon.length > 0 && (
        <Polygon
          paths={roofPolygon}
          options={{
            fillColor: "#34d399",
            fillOpacity: 0.28,
            strokeColor: "#059669",
            strokeWeight: 2,
            clickable: false,
            zIndex: 3,
          }}
        />
      )}

      <Marker
        position={selectedLocation}
        draggable
        onDragEnd={onMarkerDragEnd}
      />
    </GoogleMap>
  );
}

export default MapView;