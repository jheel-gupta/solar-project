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
    1: 31,
    2: 28,
    3: 31,
    4: 30,
    5: 31,
    6: 30,
    7: 31,
    8: 31,
    9: 30,
    10: 31,
    11: 30,
    12: 31,
  };

  return daysMap[month] || 30;
};

export default function TimeControls({
  draftTime,
  setDraftTime,
  onApply,
  loading,
  onBack,
}) {
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
        <label style={styles.label}>Month</label>
        <select
          value={draftTime.month}
          onChange={handleMonthChange}
          style={styles.select}
        >
          {months.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
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

      <button onClick={onApply} disabled={loading} style={styles.button}>
        {loading ? "Analyzing..." : "Apply Time"}
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
};