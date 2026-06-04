import { GoogleMap, Marker, Polygon, Rectangle } from "@react-google-maps/api";
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
}) {
  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={selectedLocation}
      zoom={20}
      onLoad={onLoadMap}
      options={{
        mapTypeId: "satellite",
      }}

    >
      {
        showPanels && (
          <SolarPanelsOverlay
            solarData={solarData}
          />
        )
      }

      {roofPolygon.length>0 && (
        <Polygon
          paths={roofPolygon}
          options={{
            fillColor: "#34d399",
            fillOpacity: 0.5,
            strokeColor: "#059669",
            strokeWeight: 2,
          }}
        />
      )

      }
    <Marker 
      position={selectedLocation}
      draggable={true}
      onDragEnd={onMarkerDragEnd}
    />
    </GoogleMap>
  );
}

export default MapView;