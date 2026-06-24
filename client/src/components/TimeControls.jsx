import { useTime } from "../context/TimeContext";
import { useFluxOverlay } from "../context/FluxOverlayContext";

const months = [
  { label: "January", value: 1 },
  { label: "February", value: 2 },
  { label: "March", value: 3 },
  { label: "April", value: 4 },
  { label: "May", value: 5 },
  { label: "June", value: 6 },
  { label: "July", value: 7 },
  { label: "August", value: 8 },
  { label: "September", value: 9 },
  { label: "October", value: 10 },
  { label: "November", value: 11 },
  { label: "December", value: 12 },
];

const getDaysInMonth = (month) => {
  const daysMap = {
    1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30,
    7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31,
  };
  return daysMap[month] || 30;
};

// onBack stays a prop — it's navigation state owned by App.jsx's
// activePanel, not shared app data, so it doesn't belong in context.
export default function TimeControls({ onBack }) {
  const { draftTime, setDraftTime, handleApplyTime, analysisLoading } =
    useTime();

  const {
    showFluxOverlay,
    setShowFluxOverlay,
    monthlyFluxOverlay,
    maskRooftop,
    setMaskRooftop,
  } = useFluxOverlay();

  const handleMonthChange = (e) => {
    const month = Number(e.target.value);

    setDraftTime((prev) => ({
      ...prev,
      month,
      day: Math.min(prev.day, getDaysInMonth(month)),
    }));
  };

  const handleDayChange = (e) => {
    const day = Number(e.target.value);

    setDraftTime((prev) => ({
      ...prev,
      day,
    }));
  };

  const handleHourChange = (e) => {
    const hour = Number(e.target.value);

    setDraftTime((prev) => ({
      ...prev,
      hour,
    }));
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.headerRow}>
        <button
          onClick={onBack}
          style={styles.iconButton}
          aria-label="Back to solar insights"
          title="Back to solar insights"
        >
          ←
        </button>
        <h3 style={styles.heading}>Solar Time Controls</h3>
      </div>

      <div style={styles.controlGroup}>
        <label style={styles.label}>
          Month: <strong>{months.find((m) => m.value === draftTime.month)?.label}</strong>
        </label>
        <input
          type="range"
          min="1"
          max="12"
          step="1"
          value={draftTime.month}
          onChange={handleMonthChange}
          style={styles.slider}
        />
        <div style={styles.monthTicks}>
          {months.map((month) => (
            <span
              key={month.value}
              style={{
                fontSize: "10px",
                color: month.value === draftTime.month ? "#111827" : "#6b7280",
                fontWeight: month.value === draftTime.month ? 700 : 500,
                textAlign: "center",
              }}
            >
              {month.label.slice(0, 3)}
            </span>
          ))}
        </div>
      </div>

      <div style={styles.controlGroup}>
        <button
          type="button"
          onClick={() => setShowFluxOverlay((prev) => !prev)}
          style={{
            ...styles.button,
            background: showFluxOverlay ? "#ca8a04" : "#1f2937",
          }}
        >
          {showFluxOverlay ? "Hide Monthly Solar Flux" : "Show Monthly Solar Flux"}
        </button>

        {showFluxOverlay && (
          <button
            type="button"
            onClick={() => setMaskRooftop((prev) => !prev)}
            style={{
              ...styles.button,
              marginTop: "8px",
              background: maskRooftop ? "#059669" : "#6b7280",
            }}
          >
            {maskRooftop ? "Showing Rooftops Only" : "Mask Rooftop Only"}
          </button>
        )}

        {showFluxOverlay && monthlyFluxOverlay && (
          <div
            style={{
              marginTop: "8px",
              padding: "10px",
              borderRadius: "8px",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              fontSize: "12px",
              color: "#374151",
            }}
          >
            <div>
              Month flux range: <strong>{monthlyFluxOverlay.minFlux?.toFixed?.(2)}</strong> to{" "}
              <strong>{monthlyFluxOverlay.maxFlux?.toFixed?.(2)}</strong>
            </div>
            {maskRooftop && (
              <div style={{ marginTop: "4px", color: "#059669", fontWeight: 600 }}>
                Showing roof pixels only — streets and trees hidden
              </div>
            )}
            <div style={{ marginTop: "6px" }}>
              The overlay gets deeper in months with stronger flux and lighter in lower-flux months.
            </div>
          </div>
        )}
      </div>

      <div style={styles.controlGroup}>
        <label style={styles.label}>
          Day: <strong>{draftTime.day}</strong>
        </label>
        <input
          type="range"
          min="1"
          max={getDaysInMonth(draftTime.month)}
          step="1"
          value={draftTime.day}
          onChange={handleDayChange}
          style={styles.slider}
        />
      </div>

      <div style={styles.controlGroup}>
        <label style={styles.label}>
          Hour: <strong>{draftTime.hour}:00</strong>
        </label>
        <input
          type="range"
          min="6"
          max="18"
          step="1"
          value={draftTime.hour}
          onChange={handleHourChange}
          style={styles.slider}
        />
      </div>

      <button onClick={handleApplyTime} disabled={analysisLoading} style={styles.button}>
        {analysisLoading ? "Analyzing..." : "Apply Time"}
      </button>
    </div>
  );
}

const styles = {
  wrapper: {
    padding: "14px",
    background: "#fff",
    borderRadius: "10px",
    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  heading: {
    margin: 0,
    fontSize: "16px",
  },
  controlGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    fontWeight: 500,
  },
  select: {
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "13px",
  },
  slider: {
    width: "100%",
  },
  button: {
    padding: "9px 12px",
    border: "none",
    borderRadius: "8px",
    background: "#1a73e8",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "13px",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  iconButton: {
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
  },
  monthTicks: {
    display: "grid",
    gridTemplateColumns: "repeat(12, 1fr)",
    gap: "2px",
    marginTop: "4px",
  },
};