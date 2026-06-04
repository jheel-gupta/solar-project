import { Autocomplete } from "@react-google-maps/api";

function SearchBox({
  onLoadAutocomplete,
  onPlaceChanged
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: "20px",
        left: "20px",
        zIndex: 10,
        width: "300px",
      }}
    >
      <Autocomplete
        onLoad={onLoadAutocomplete}
        onPlaceChanged={onPlaceChanged}
      >
        <input
          type="text"
          placeholder="Search location..."
        />
      </Autocomplete>
    </div>
  );
}

export default SearchBox;