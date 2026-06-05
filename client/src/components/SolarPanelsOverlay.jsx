import { useMemo } from "react";
import { Circle, Polygon } from "@react-google-maps/api";

function offsetLatLng(lat, lng, distanceMeters, headingDegrees) {
  const R = 6378137;
  const brng = (headingDegrees * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceMeters / R) +
      Math.cos(lat1) * Math.sin(distanceMeters / R) * Math.cos(brng)
  );

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(distanceMeters / R) * Math.cos(lat1),
      Math.cos(distanceMeters / R) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lng2 * 180) / Math.PI,
  };
}

function buildPanelPolygon(panel, solarPotential) {
  const segment = solarPotential?.roofSegmentStats?.[panel.segmentIndex];
  if (!segment || !panel?.center) return null;

  const azimuth = segment.azimuthDegrees ?? 0;
  const panelHeight = solarPotential.panelHeightMeters ?? 1.879;
  const panelWidth = solarPotential.panelWidthMeters ?? 1.045;

  const isPortrait = panel.orientation === "PORTRAIT";

  // Azimuth = direction roof faces (down-slope).
  // Panels are laid ACROSS the slope, so the long axis is perpendicular to azimuth.
  const longHeading = isPortrait ? azimuth + 90 : azimuth; // ← swapped from your version
  const longHalf = (isPortrait ? panelHeight : panelWidth) / 2;
  const shortHalf = (isPortrait ? panelWidth : panelHeight) / 2;

  const centerLat = panel.center.latitude;
  const centerLng = panel.center.longitude;

  const topMid    = offsetLatLng(centerLat, centerLng, longHalf, longHeading);
  const bottomMid = offsetLatLng(centerLat, centerLng, longHalf, longHeading + 180);
  const topLeft   = offsetLatLng(topMid.lat,    topMid.lng,    shortHalf, longHeading - 90);
  const topRight  = offsetLatLng(topMid.lat,    topMid.lng,    shortHalf, longHeading + 90);
  const bottomRight = offsetLatLng(bottomMid.lat, bottomMid.lng, shortHalf, longHeading + 90);
  const bottomLeft  = offsetLatLng(bottomMid.lat, bottomMid.lng, shortHalf, longHeading - 90);

  return [topLeft, topRight, bottomRight, bottomLeft];
}

function SolarPanelsOverlay({
  solarPotential,
  selectedConfigIndex = 0,
  zoom = 20,
}) {
  const configs = solarPotential?.solarPanelConfigs || [];
  const solarPanels = solarPotential?.solarPanels || [];

  const safeConfigIndex =
    configs.length === 0
      ? 0
      : Math.min(selectedConfigIndex, configs.length - 1);

  const selectedConfig = configs[safeConfigIndex];

  const panelsToRender = useMemo(() => {
    if (!selectedConfig) return [];
    return solarPanels.slice(0, selectedConfig.panelsCount);
  }, [solarPanels, selectedConfig]);

  const panelPolygons = useMemo(() => {
    return panelsToRender
      .map((panel, index) => {
        const path = buildPanelPolygon(panel, solarPotential);
        if (!path) return null;

        return {
          key: `${panel.segmentIndex}-${index}`,
          path,
        };
      })
      .filter(Boolean);
  }, [panelsToRender, solarPotential]);

  const showIndividualPanels = zoom >= 19;

  if (!selectedConfig) return null;

  // if (!showIndividualPanels) {
  //   return (
  //     <>
  //       {selectedConfig.roofSegmentSummaries?.map((summary, index) => {
  //         const seg = solarPotential?.roofSegmentStats?.[summary.segmentIndex];
  //         if (!seg?.center) return null;

  //         return (
  //           <Circle
  //             key={`segment-${summary.segmentIndex}-${index}`}
  //             center={{
  //               lat: seg.center.latitude,
  //               lng: seg.center.longitude,
  //             }}
  //             radius={Math.max(5, Math.sqrt(summary.panelsCount || 1) * 2.5)}
  //             options={{
  //               fillColor: "#2563eb",
  //               fillOpacity: 0.35,
  //               strokeColor: "#1d4ed8",
  //               strokeOpacity: 0.85,
  //               strokeWeight: 1,
  //               clickable: false,
  //               zIndex: 6,
  //             }}
  //           />
  //         );
  //       })}
  //     </>
  //   );
  // }

  return (
    <>
      {panelPolygons.map((polygon) => (
        <Polygon
          key={polygon.key}
          paths={polygon.path}
          options={{
            fillColor: "#2563eb",
            fillOpacity: 0.72,
            strokeColor: "#1e3a8a",
            strokeOpacity: 0.9,
            strokeWeight: 0.7,
            clickable: false,
            zIndex: 10,
          }}
        />
      ))}
    </>
  );
}

export default SolarPanelsOverlay;