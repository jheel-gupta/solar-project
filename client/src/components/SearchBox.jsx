import { Autocomplete } from "@react-google-maps/api";

function SearchBox({ onLoadAutocomplete, onPlaceChanged }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "18px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 20,
        width: "min(620px, calc(100% - 32px))",
      }}
    >
      <Autocomplete
        onLoad={onLoadAutocomplete}
        onPlaceChanged={onPlaceChanged}
      >
        <input
          type="text"
          placeholder="Search building or address..."
          aria-label="Search building or address"
          style={{
            width: "100%",
            height: "46px",
            padding: "0 18px",
            borderRadius: "14px",
            border: "1px solid #d1d5db",
            outline: "none",
            background: "#fff",
            fontSize: "16px",
            boxSizing: "border-box",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        />
      </Autocomplete>
    </div>
  );
}

export default SearchBox;