import { useRef, useEffect } from 'react';
import { cn } from '@go2fix/shared';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';

export interface ParsedAddress {
  streetAddress: string;
  city: string;
  county: string;
  postalCode: string;
  neighborhood: string;
  floor: string;
  apartment: string;
  latitude: number | null;
  longitude: number | null;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: ParsedAddress) => void;
  /** City names to bias autocomplete results toward (e.g. ["Cluj-Napoca", "Bucuresti"]) */
  biasTowardCities?: string[];
  label?: string;
  placeholder?: string;
  error?: string;
  className?: string;
}

// Well-known Romanian city center coordinates for geographic biasing.
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'bucuresti': { lat: 44.4268, lng: 26.1025 },
  'bucharest': { lat: 44.4268, lng: 26.1025 },
  'cluj-napoca': { lat: 46.7712, lng: 23.6236 },
  'cluj': { lat: 46.7712, lng: 23.6236 },
  'timisoara': { lat: 45.7489, lng: 21.2087 },
  'iasi': { lat: 47.1585, lng: 27.6014 },
  'constanta': { lat: 44.1598, lng: 28.6348 },
  'brasov': { lat: 45.6427, lng: 25.5887 },
  'craiova': { lat: 44.3302, lng: 23.7949 },
  'galati': { lat: 45.4353, lng: 28.0080 },
  'ploiesti': { lat: 44.9462, lng: 26.0254 },
  'oradea': { lat: 47.0465, lng: 21.9189 },
  'sibiu': { lat: 45.7983, lng: 24.1256 },
  'arad': { lat: 46.1866, lng: 21.3123 },
  'pitesti': { lat: 44.8565, lng: 24.8692 },
  'bacau': { lat: 46.5670, lng: 26.9146 },
  'targu mures': { lat: 46.5386, lng: 24.5575 },
  'baia mare': { lat: 47.6567, lng: 23.5850 },
  'buzau': { lat: 45.1500, lng: 26.8333 },
  'satu mare': { lat: 47.7900, lng: 22.8850 },
  'botosani': { lat: 47.7487, lng: 26.6694 },
  'suceava': { lat: 47.6514, lng: 26.2554 },
  'deva': { lat: 45.8833, lng: 22.9000 },
  'alba iulia': { lat: 46.0667, lng: 23.5833 },
};

function buildBoundsFromCities(cityNames: string[]): google.maps.LatLngBoundsLiteral | null {
  const points: { lat: number; lng: number }[] = [];
  for (const name of cityNames) {
    const key = name.toLowerCase().trim();
    const coord = CITY_COORDS[key];
    if (coord) points.push(coord);
  }
  if (points.length === 0) return null;

  // ~30km radius around each city center
  const OFFSET = 0.3;
  let south = points[0].lat, north = points[0].lat;
  let west = points[0].lng, east = points[0].lng;
  for (const p of points) {
    south = Math.min(south, p.lat - OFFSET);
    north = Math.max(north, p.lat + OFFSET);
    west = Math.min(west, p.lng - OFFSET);
    east = Math.max(east, p.lng + OFFSET);
  }
  return { south, north, west, east };
}

function parsePlace(place: google.maps.places.PlaceResult): ParsedAddress {
  const components = place.address_components ?? [];
  const get = (type: string) =>
    components.find((c) => c.types.includes(type))?.long_name ?? '';

  const streetNumber = get('street_number');
  const route = get('route');
  const streetAddress = streetNumber ? `${route} ${streetNumber}` : route;

  // Extract neighborhood from multiple possible component types.
  const neighborhood =
    get('neighborhood') ||
    get('sublocality_level_1') ||
    get('sublocality') ||
    '';

  // Extract floor and apartment from Google Places components.
  const floor = get('floor');
  const apartment = get('subpremise');

  return {
    streetAddress,
    city: get('locality') || get('administrative_area_level_2'),
    county: get('administrative_area_level_1'),
    postalCode: get('postal_code'),
    neighborhood,
    floor,
    apartment,
    latitude: place.geometry?.location?.lat() ?? null,
    longitude: place.geometry?.location?.lng() ?? null,
  };
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  biasTowardCities,
  label,
  placeholder = 'Cauta adresa...',
  error,
  className,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const callbacksRef = useRef({ onChange, onAddressSelect });
  const { isLoaded } = useGoogleMapsLoader();

  // Keep callbacks ref up to date so the listener never uses stale closures.
  callbacksRef.current = { onChange, onAddressSelect };

  // Sync external value changes to the uncontrolled input (e.g. when editing
  // an existing address or when the parent resets the form).
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    const options: google.maps.places.AutocompleteOptions = {
      componentRestrictions: { country: 'ro' },
      fields: ['address_components', 'geometry'],
      types: ['address'],
    };

    // Bias results toward supported cities.
    if (biasTowardCities && biasTowardCities.length > 0) {
      const bounds = buildBoundsFromCities(biasTowardCities);
      if (bounds) {
        options.bounds = bounds;
      }
    }

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, options);

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place?.address_components) return;

      const parsed = parsePlace(place);

      // Overwrite whatever Google put in the input with just the street address.
      if (inputRef.current) {
        inputRef.current.value = parsed.streetAddress;
      }

      callbacksRef.current.onChange(parsed.streetAddress);
      callbacksRef.current.onAddressSelect(parsed);
    });

    autocompleteRef.current = autocomplete;

    return () => {
      google.maps.event.clearInstanceListeners(autocomplete);
      autocompleteRef.current = null;
    };
  }, [isLoaded, biasTowardCities]);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
          error ? 'border-danger' : 'border-gray-300',
          className,
        )}
      />
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
