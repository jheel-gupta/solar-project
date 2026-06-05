function SolarInfoCard({
  solarData,
  selectedConfigIndex,
  setSelectedConfigIndex,
}) {
  if (!solarData?.solarPotential) return null;

  const solarPotential = solarData.solarPotential;
  const configs = solarPotential.solarPanelConfigs || [];

  if (!configs.length) {
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
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Solar Insights</h2>
        <p><strong>Region:</strong> {solarData.regionCode}</p>
        <p><strong>Postal Code:</strong> {solarData.postalCode}</p>
        <p><strong>Image Quality:</strong> {solarData.imageryQuality}</p>
        <p><strong>Max Panels:</strong> {solarPotential.maxArrayPanelsCount}</p>
        <p><strong>Roof Area:</strong> {solarPotential.maxArrayAreaMeters2?.toFixed?.(1)} m²</p>
      </div>
    );
  }

  const safeConfigIndex = Math.min(selectedConfigIndex, configs.length - 1);
  const selectedConfig = configs[safeConfigIndex];

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
        width: "340px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 12 }}>Solar Insights</h2>

      <p><strong>Region:</strong> {solarData.regionCode}</p>
      <p><strong>Postal Code:</strong> {solarData.postalCode}</p>
      <p><strong>Image Quality:</strong> {solarData.imageryQuality}</p>
      <p><strong>Max Panels:</strong> {solarPotential.maxArrayPanelsCount}</p>
      <p><strong>Roof Area:</strong> {solarPotential.maxArrayAreaMeters2?.toFixed?.(1)} m²</p>

      <hr style={{ margin: "16px 0" }} />

      <label
        htmlFor="config-slider"
        style={{ display: "block", marginBottom: 10, fontWeight: 600 }}
      >
        Panel configuration
      </label>

      <input
        id="config-slider"
        type="range"
        min={0}
        max={configs.length - 1}
        step={1}
        value={safeConfigIndex}
        onChange={(e) => setSelectedConfigIndex(Number(e.target.value))}
        style={{ width: "100%" }}
      />

      <div style={{ marginTop: 14, lineHeight: 1.7 }}>
        <p><strong>Panels:</strong> {selectedConfig.panelsCount}</p>
        <p>
          <strong>Yearly DC Energy:</strong>{" "}
          {Math.round(selectedConfig.yearlyEnergyDcKwh || 0).toLocaleString()} kWh
        </p>
        <p>
          <strong>Segments used:</strong>{" "}
          {selectedConfig.roofSegmentSummaries?.length || 0}
        </p>
        <p>
          <strong>System size:</strong>{" "}
          {(
            ((selectedConfig.panelsCount || 0) *
              (solarPotential.panelCapacityWatts || 0)) /
            1000
          ).toFixed(1)}{" "}
          kW
        </p>
      </div>
    </div>
  );
}

export default SolarInfoCard;