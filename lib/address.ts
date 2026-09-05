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

type NominatimResult = {
  place_id?: number;
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

export function formatNominatimResult(result: NominatimResult, index: number): AddressSuggestion | null {
  const lat = Number(result.lat);
  const lon = Number(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const addr = result.address || {};
  const streetLine = [addr.house_number, addr.road].filter(Boolean).join(" ");
  const city = addr.city || addr.town || addr.village;
  const locality = [city, addr.state, addr.postcode].filter(Boolean).join(", ");
  const label =
    [streetLine, locality].filter(Boolean).join(", ") ||
    result.display_name?.split(",").slice(0, 3).join(",").trim() ||
    "";
  if (!label) return null;

  return {
    id: `nominatim-${result.place_id ?? index}`,
    label,
    street: streetLine || undefined,
    city: city || undefined,
    state: addr.state,
    postcode: addr.postcode,
    country: addr.country,
    lat,
    lon,
  };
}

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

function component(
  components: GoogleAddressComponent[],
  type: string,
  short = false
): string | undefined {
  const match = components.find((c) => c.types.includes(type));
  if (!match) return undefined;
  return short ? match.short_name : match.long_name;
}

export function formatGooglePlace(details: {
  place_id?: string;
  formatted_address?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  address_components?: GoogleAddressComponent[];
}): AddressSuggestion | null {
  const lat = details.geometry?.location?.lat;
  const lon = details.geometry?.location?.lng;
  if (typeof lat !== "number" || typeof lon !== "number") return null;

  const components = details.address_components || [];
  const streetNumber = component(components, "street_number");
  const route = component(components, "route");
  const streetLine = [streetNumber, route].filter(Boolean).join(" ");
  const city =
    component(components, "locality") ||
    component(components, "sublocality") ||
    component(components, "neighborhood");
  const state = component(components, "administrative_area_level_1", true);
  const postcode = component(components, "postal_code");
  const country = component(components, "country");

  const locality = [city, state, postcode].filter(Boolean).join(", ");
  const label =
    [streetLine, locality].filter(Boolean).join(", ") ||
    details.formatted_address?.replace(/, USA$/, "") ||
    "";
  if (!label) return null;

  return {
    id: `google-${details.place_id || `${lat},${lon}`}`,
    label,
    street: streetLine || undefined,
    city: city || undefined,
    state: state || undefined,
    postcode: postcode || undefined,
    country: country || undefined,
    lat,
    lon,
  };
}
