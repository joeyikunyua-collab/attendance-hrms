export interface GeoCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export type GeoErrorReason = "unsupported" | "permission-denied" | "unavailable" | "timeout";

type GeoResult = { coords: GeoCoords; reason?: undefined } | { coords?: undefined; reason: GeoErrorReason };

function getPosition(): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ reason: "unsupported" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) resolve({ reason: "permission-denied" });
        else if (err.code === err.TIMEOUT) resolve({ reason: "timeout" });
        else resolve({ reason: "unavailable" });
      },
      { timeout: 8000 }
    );
  });
}

/**
 * Resolves with the browser's current position, or null if geolocation is
 * unsupported, denied, or times out. Never rejects - callers can always
 * spread the result into a request payload without extra error handling.
 */
export function getCurrentLocation(): Promise<GeoCoords | null> {
  return getPosition().then((result) => result.coords ?? null);
}

/** Same lookup, but keeps the failure reason so the caller can show specific guidance. */
export function getCurrentLocationResult(): Promise<GeoResult> {
  return getPosition();
}
