/**
 * Geografiske beregninger (Haversine-formlen) og GeoGuessr-pointmodel.
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Beregner storcirkelafstanden i kilometer mellem to punkter med Haversine-formlen.
 */
export function calculateHaversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_KM * c;
}

/**
 * Beregner rundepoint ud fra afstanden i km (maks. 5.000 point pr. runde).
 * Bruger eksponentiel faldskala inspireret af GeoGuessr:
 * - Under 35 km giver fulde 5.000 point
 * - Rammer man landet (~200–400 km) får man ca. 3.800–4.400 point
 * - Naboland (~800 km) giver ca. 2.900 point
 * - Andet kontinent (>6.000 km) nærmer sig 0–150 point
 */
export function calculateRoundScore(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return 0;
  if (distanceKm <= 35) return 5000;
  const score = 5000 * Math.exp(-(distanceKm - 35) / 1650);
  return Math.max(0, Math.min(5000, Math.round(score)));
}

export function formatDistanceKm(km: number): string {
  if (km < 10) {
    return `${km.toFixed(1).replace('.', ',')} km`;
  }
  return `${Math.round(km).toLocaleString('da-DK')} km`;
}

export function formatPoints(points: number): string {
  return points.toLocaleString('da-DK');
}
