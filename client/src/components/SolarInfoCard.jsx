function SolarInfoCard({
  solarData,
  selectedConfigIndex,
  setSelectedConfigIndex,
  onOpenTimeControls,
}) {
  if (!solarData?.solarPotential) return null;

  const solarPotential = solarData.solarPotential;
  const configs = solarPotential.solarPanelConfigs || [];

  const cardStyle = {
    background: "white",
    padding: "14px",
    borderRadius: "10px",
    width: "100%",
    boxSizing: "border-box",
    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
    fontSize: "13px",
    lineHeight: 1.5,
  };

  const headerRowStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "10px",
  };

  const iconButtonStyle = {
    width: "32px",
    height: "32px",
    borderRadius: "999px",
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: "pointer",
    fontSize: "18px",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  };

  if (!configs.length) {
    return (
      <div style={cardStyle}>
        <div style={headerRowStyle}>
        <h3 style={{ margin: 0, fontSize: "16px" }}>Solar Insights</h3>
        <button
          onClick={onOpenTimeControls}
          style={iconButtonStyle}
          aria-label="Open solar time controls"
          title="Open solar time controls"
        >
          →
        </button>
      </div>

        <p><strong>Region:</strong> {solarData.regionCode}</p>
        <p><strong>Postal:</strong> {solarData.postalCode}</p>
        <p><strong>Quality:</strong> {solarData.imageryQuality}</p>
        <p><strong>Max Panels:</strong> {solarPotential.maxArrayPanelsCount}</p>
        <p><strong>Roof Area:</strong> {solarPotential.maxArrayAreaMeters2?.toFixed?.(1)} m²</p>
      </div>
    );
  }

  const safeConfigIndex = Math.min(selectedConfigIndex, configs.length - 1);
  const selectedConfig = configs[safeConfigIndex];

  return (
    <div style={cardStyle}>
      <div style={headerRowStyle}>
      <h3 style={{ margin: 0, fontSize: "16px" }}>Solar Insights</h3>
      <button
        onClick={onOpenTimeControls}
        style={iconButtonStyle}
        aria-label="Open solar time controls"
        title="Open solar time controls"
      >
        →
      </button>
    </div>

      <p><strong>Region:</strong> {solarData.regionCode}</p>
      <p><strong>Postal:</strong> {solarData.postalCode}</p>
      <p><strong>Quality:</strong> {solarData.imageryQuality}</p>
      <p><strong>Max Panels:</strong> {solarPotential.maxArrayPanelsCount}</p>
      <p><strong>Roof Area:</strong> {solarPotential.maxArrayAreaMeters2?.toFixed?.(1)} m²</p>

      <hr style={{ margin: "12px 0" }} />

      <label
        htmlFor="config-slider"
        style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: "13px" }}
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

      <div style={{ marginTop: 10 }}>
        <p><strong>Panels:</strong> {selectedConfig.panelsCount}</p>
        <p>
          <strong>Energy:</strong>{" "}
          {Math.round(selectedConfig.yearlyEnergyDcKwh || 0).toLocaleString()} kWh
        </p>
        <p>
          <strong>Segments:</strong>{" "}
          {selectedConfig.roofSegmentSummaries?.length || 0}
        </p>
        <p>
          <strong>Size:</strong>{" "}
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