import { useEffect, useState, useRef } from "react";
import { GoogleMap, Marker, Polygon } from "@react-google-maps/api";
import SolarPanelsOverlay from "./SolarPanelsOverlay";
import { useSolarData } from "../context/SolarDataContext";
import { useFluxOverlay } from "../context/FluxOverlayContext";

const containerStyle = {
  width: "100%",
  height: "100%",
};

function MapView({ selectedLocation, onLoadMap, onMarkerDragEnd }) {
  const [mapRef, setMapRef] = useState(null);
  const [zoom, setZoom] = useState(20);
  const overlayRef = useRef(null);

  const { solarData, showPanels, roofPolygon, useSmartPlacement, scoringLoading } = useSolarData();
  const { monthlyFluxOverlay, showFluxOverlay } = useFluxOverlay();

  const handleLoad = (map) => {
    setMapRef(map);
    setZoom(map.getZoom() || 20);
    if (onLoadMap) onLoadMap(map);
  };

  useEffect(() => {
    if (!mapRef || !selectedLocation) return;
    mapRef.panTo(selectedLocation);
  }, [mapRef, selectedLocation]);

  useEffect(() => {
    if (!mapRef || !window.google) return;

    if (overlayRef.current) {
      overlayRef.current.setMap(null);
      overlayRef.current = null;
    }

    if (!showFluxOverlay) return;
    if (!monthlyFluxOverlay?.imageUrl || !monthlyFluxOverlay?.bounds) return;

    const { north, south, east, west } = monthlyFluxOverlay.bounds;
    const sw = new window.google.maps.LatLng(south, west);
    const ne = new window.google.maps.LatLng(north, east);
    const bounds = new window.google.maps.LatLngBounds(sw, ne);

    overlayRef.current = new window.google.maps.GroundOverlay(
      monthlyFluxOverlay.imageUrl,
      bounds,
      { opacity: 1 }
    );
    overlayRef.current.setMap(mapRef);

    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };
  }, [mapRef, monthlyFluxOverlay, showFluxOverlay]);

  // Badge only appears when panels are visible
  const showBadge = showPanels && solarData?.solarPotential;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>

      {/* ── Mode badge ───────────────────────────────────────── */}
      {showBadge && (
        <div style={{
          position: "absolute",
          top: "12px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: useSmartPlacement ? "rgba(22,163,74,0.92)" : "rgba(37,99,235,0.92)",
          color: "#fff",
          fontSize: "12px",
          fontWeight: 600,
          padding: "6px 14px",
          borderRadius: "999px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          pointerEvents: "none",
          transition: "background 0.2s",
          whiteSpace: "nowrap",
        }}>
          <span style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: scoringLoading ? "#fbbf24" : "#fff",
            flexShrink: 0,
          }} />
          {scoringLoading
            ? "Scoring panels…"
            : useSmartPlacement
              ? "Smart placement — flux + shade ranked"
              : "Google default placement"}
        </div>
      )}

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={selectedLocation}
        zoom={20}
        onLoad={handleLoad}
        onZoomChanged={() => {
          if (mapRef) setZoom(mapRef.getZoom() || 20);
        }}
        options={{
          mapTypeId: "satellite",
          tilt: 0,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        {showPanels && solarData?.solarPotential && (
          <SolarPanelsOverlay zoom={zoom} />
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
    </div>
  );
}

export default MapView;