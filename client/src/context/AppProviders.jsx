import { LocationProvider } from "./LocationContext";
import { SolarDataProvider } from "./SolarDataContext";
import { TimeProvider } from "./TimeContext";
import { FluxOverlayProvider } from "./FluxOverlayContext";

// Order matters: a provider that internally calls another context's hook
// must be nested INSIDE that other provider.
//
// LocationProvider     -> no dependencies
// SolarDataProvider    -> no dependencies (doesn't actually need location)
// TimeProvider         -> needs useLocation()
// FluxOverlayProvider  -> needs useLocation() AND useTime()
//
// So FluxOverlayProvider must be the innermost wrapper.
export function AppProviders({ children }) {
  return (
    <LocationProvider>
      <SolarDataProvider>
        <TimeProvider>
          <FluxOverlayProvider>{children}</FluxOverlayProvider>
        </TimeProvider>
      </SolarDataProvider>
    </LocationProvider>
  );
}