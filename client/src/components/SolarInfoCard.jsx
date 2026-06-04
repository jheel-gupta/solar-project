function SolarInfoCard({ solarData }) {
  if (!solarData) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "100px",
        left: "20px",
        zIndex: 10,
        background: "white",
        padding: "20px",
        borderRadius: "12px",
        width: "320px",
      }}
    >
      <h2>Solar Insights</h2>

      <p><strong>Region:</strong> {solarData.regionCode}</p>

      <p><strong>Postal Code:</strong> {solarData.postalCode}</p>

      <p><strong>Image Quality:</strong> {solarData.imageryQuality}</p>

      <p>
        <strong>Max Panels:</strong>
        {solarData.solarPotential.maxArrayPanelsCount}
      </p>

      <p>
        <strong>Roof Area:</strong>
        {solarData.solarPotential.maxArrayAreaMeters2} m²
      </p>
    </div>
  );
}

export default SolarInfoCard;