import { Rectangle } from "@react-google-maps/api";

function SolarPanelsOverlay({ solarData }) {
  return (
    <>
      {solarPanels?.slice(0,500).map((panel,index) => {
        const lat = panel.center.latitude;
        const lng = panel.center.longitude;

        return (
          <Rectangle
            key={index}
            bounds={{
              north: lat + 0.000008,
              south: lat - 0.000008,
              east: lng + 0.000004,
              west: lng - 0.000004,
            }}
            options={{
              fillColor: "#2563eb",
              fillOpacity: 0.7,
              strokeWeight: 0,
            }}
          />
        );
      })}
    </>
  );
}

export default SolarPanelsOverlay;