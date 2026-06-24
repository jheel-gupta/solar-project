import { useSolarData } from "../context/SolarDataContext";
import { useLocation } from "../context/LocationContext";

function SolarInfoCard({ onOpenTimeControls }) {
  const { selectedLocation } = useLocation();

  const {
    solarData,
    selectedConfigIndex,
    setSelectedConfigIndex,
    useSmartPlacement,
    setUseSmartPlacement,
    scoredPanels,
    scoringStats,
    scoringLoading,
    scoringError,
    runPanelScoring,
  } = useSolarData();

  if (!solarData?.solarPotential) return null;

  const solarPotential = solarData.solarPotential;
  const configs = solarPotential.solarPanelConfigs || [];

  // ─── Styles ───────────────────────────────────────────────

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

  const statRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    padding: "3px 0",
    borderBottom: "1px solid #f3f4f6",
  };

  const pillStyle = (color) => ({
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 600,
    background: color,
    color: "#fff",
    marginLeft: "6px",
  });

  // ─── Handlers ─────────────────────────────────────────────

  const handleSmartToggle = async () => {
    const next = !useSmartPlacement;
    setUseSmartPlacement(next);

    // Trigger scoring if turning on and we don't have results yet
    if (next && !scoredPanels && selectedLocation) {
      await runPanelScoring(selectedLocation.lat, selectedLocation.lng);
    }
  };

  const handleRescore = async () => {
    if (!selectedLocation) return;
    await runPanelScoring(selectedLocation.lat, selectedLocation.lng);
  };

  // ─── Early return: no configs ──────────────────────────────

  if (!configs.length) {
    return (
      <div style={cardStyle}>
        <div style={headerRowStyle}>
          <h3 style={{ margin: 0, fontSize: "16px" }}>Solar Insights</h3>
          <button onClick={onOpenTimeControls} style={iconButtonStyle} aria-label="Open solar time controls">→</button>
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

  // ─── Render ────────────────────────────────────────────────

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={headerRowStyle}>
        <h3 style={{ margin: 0, fontSize: "16px" }}>Solar Insights</h3>
        <button onClick={onOpenTimeControls} style={iconButtonStyle} aria-label="Open solar time controls">→</button>
      </div>

      {/* Basic info */}
      <p style={{ margin: "4px 0" }}><strong>Region:</strong> {solarData.regionCode}</p>
      <p style={{ margin: "4px 0" }}><strong>Postal:</strong> {solarData.postalCode}</p>
      <p style={{ margin: "4px 0" }}><strong>Quality:</strong> {solarData.imageryQuality}</p>
      <p style={{ margin: "4px 0" }}><strong>Max Panels:</strong> {solarPotential.maxArrayPanelsCount}</p>
      <p style={{ margin: "4px 0" }}><strong>Roof Area:</strong> {solarPotential.maxArrayAreaMeters2?.toFixed?.(1)} m²</p>

      <hr style={{ margin: "12px 0" }} />

      {/* Panel config slider */}
      <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: "13px" }}>
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
        <p style={{ margin: "3px 0" }}><strong>Panels:</strong> {selectedConfig.panelsCount}</p>
        <p style={{ margin: "3px 0" }}>
          <strong>Energy:</strong> {Math.round(selectedConfig.yearlyEnergyDcKwh || 0).toLocaleString()} kWh
        </p>
        <p style={{ margin: "3px 0" }}>
          <strong>Size:</strong>{" "}
          {(((selectedConfig.panelsCount || 0) * (solarPotential.panelCapacityWatts || 0)) / 1000).toFixed(1)} kW
        </p>
      </div>

      <hr style={{ margin: "12px 0" }} />

      {/* ── Placement Mode Switcher ── */}
      <div>
        <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "8px" }}>
          Panel Placement View
        </div>

        {/* Two-button toggle */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          borderRadius: "8px",
          overflow: "hidden",
          border: "1px solid #d1d5db",
          marginBottom: "10px",
        }}>
          <button
            onClick={() => setUseSmartPlacement(false)}
            style={{
              padding: "8px 6px",
              fontSize: "12px",
              fontWeight: 600,
              border: "none",
              borderRight: "1px solid #d1d5db",
              cursor: "pointer",
              background: !useSmartPlacement ? "#1a73e8" : "#f9fafb",
              color: !useSmartPlacement ? "#fff" : "#374151",
              transition: "background 0.15s",
            }}
          >
            Google Default
          </button>
          <button
            onClick={handleSmartToggle}
            disabled={scoringLoading}
            style={{
              padding: "8px 6px",
              fontSize: "12px",
              fontWeight: 600,
              border: "none",
              cursor: scoringLoading ? "not-allowed" : "pointer",
              background: useSmartPlacement ? "#1a73e8" : "#f9fafb",
              color: useSmartPlacement ? "#fff" : "#374151",
              transition: "background 0.15s",
            }}
          >
            {scoringLoading ? "Scoring…" : "Smart (Flux + Shade)"}
          </button>
        </div>

        {/* Mode description */}
        <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#6b7280", lineHeight: 1.5 }}>
          {useSmartPlacement
            ? "Panels re-ranked by annual flux × shade score. Colour shows relative quality: green = best, red = worst."
            : "Google's original panel ordering. All panels shown in uniform blue."}
        </p>

        {/* Error state */}
        {scoringError && (
          <div style={{ fontSize: "12px", color: "#dc2626", marginBottom: "6px" }}>
            {scoringError}
          </div>
        )}

        {/* Smart mode stats block */}
        {useSmartPlacement && scoringStats && !scoringLoading && (
          <div style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "10px",
            fontSize: "12px",
          }}>
            <div style={statRowStyle}>
              <span>Panels scored</span>
              <strong>{scoringStats.total}</strong>
            </div>
            <div style={statRowStyle}>
              <span>Accepted</span>
              <strong style={{ color: "#16a34a" }}>{scoringStats.accepted}</strong>
            </div>
            {(scoringStats.rejectedFlux > 0 || scoringStats.rejectedNodata > 0) && (
              <div style={statRowStyle}>
                <span>Rejected (low / nodata flux)</span>
                <strong style={{ color: "#d97706" }}>
                  {(scoringStats.rejectedFlux ?? 0) + (scoringStats.rejectedNodata ?? 0)}
                </strong>
              </div>
            )}
            {scoringStats.avgAnnualFlux != null && (
              <div style={statRowStyle}>
                <span>Avg annual flux</span>
                <strong>{Math.round(scoringStats.avgAnnualFlux).toLocaleString()} kWh/kWp</strong>
              </div>
            )}
            {scoringStats.topFlux != null && (
              <div style={{ ...statRowStyle, borderBottom: "none" }}>
                <span>Best panel flux</span>
                <strong>{Math.round(scoringStats.topFlux).toLocaleString()} kWh/kWp</strong>
              </div>
            )}

            {/* Colour legend */}
            <div style={{ marginTop: "10px" }}>
              <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Colour key:</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <span style={pillStyle("#22c55e")}>Green = high</span>
                <span style={pillStyle("#eab308")}>Amber = mid</span>
                <span style={pillStyle("#ef4444")}>Red = low</span>
              </div>
            </div>

            <button
              onClick={handleRescore}
              disabled={scoringLoading}
              style={{
                marginTop: "10px",
                padding: "6px 10px",
                fontSize: "12px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                background: "#fff",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Re-score panels
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SolarInfoCard;