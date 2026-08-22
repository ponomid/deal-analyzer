export type AddressSuggestion = {
  id: string;
  label: string;
  street?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  lat: number;
  lon: number;
};

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

export function formatPhotonFeature(feature: PhotonFeature, index: number): AddressSuggestion | null {
  const props = feature.properties;
  const coords = feature.geometry?.coordinates;
  if (!props || !coords) return null;

  const [lon, lat] = coords;
  const streetLine = [props.housenumber, props.street || props.name].filter(Boolean).join(" ");
  const locality = [props.city, props.state, props.postcode].filter(Boolean).join(", ");
  const label = [streetLine, locality].filter(Boolean).join(", ");
  if (!label) return null;

  const id = `${props.osm_type || "place"}-${props.osm_id ?? index}`;

  return {
    id,
    label,
    street: streetLine || undefined,
    city: props.city,
    state: props.state,
    postcode: props.postcode,
    country: props.country,
    lat,
    lon,
  };
}
