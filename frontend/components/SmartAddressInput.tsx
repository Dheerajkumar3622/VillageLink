import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Search, MapPin, Check, AlertTriangle, Navigation, Loader2 } from 'lucide-react';

/* ────────── Types ────────── */

interface GeoResult {
  name: string;
  lat: number;
  lng: number;
  formattedAddress: string;
  pinCode?: string;
  isValidated: boolean;
  distanceKm?: number;
  durationMinutes?: number;
}

interface SmartAddressInputProps {
  label: string;
  placeholder?: string;
  onSelect: (result: GeoResult) => void;
  originLocation?: { lat: number; lng: number };
  apiKey?: string;
  className?: string;
}

/* ────────── Helpers ────────── */

const COST_PER_KM = 8;
const AVERAGE_SPEED_KMH = 30;
const ROAD_FACTOR = 1.3;

/** Haversine formula — returns distance in kilometres. */
function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLng = Math.sin(dLng / 2);
  const h =
    sinHalfLat * sinHalfLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinHalfLng * sinHalfLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function enrichWithDistance(
  result: GeoResult,
  origin?: { lat: number; lng: number },
): GeoResult {
  if (!origin) return result;
  const straight = haversineKm(origin, { lat: result.lat, lng: result.lng });
  const distanceKm = Math.round(straight * ROAD_FACTOR * 10) / 10;
  const durationMinutes = Math.round((distanceKm / AVERAGE_SPEED_KMH) * 60);
  return { ...result, distanceKm, durationMinutes };
}

/* ────────── Fallback village data ────────── */

const FALLBACK_VILLAGES: GeoResult[] = [
  { name: 'Darbhanga', formattedAddress: 'Darbhanga, Bihar 846004, India', lat: 26.1542, lng: 85.8918, pinCode: '846004', isValidated: true },
  { name: 'Madhubani', formattedAddress: 'Madhubani, Bihar 847211, India', lat: 26.3667, lng: 86.0667, pinCode: '847211', isValidated: true },
  { name: 'Samastipur', formattedAddress: 'Samastipur, Bihar 848101, India', lat: 25.8681, lng: 85.7753, pinCode: '848101', isValidated: true },
  { name: 'Muzaffarpur', formattedAddress: 'Muzaffarpur, Bihar 842001, India', lat: 26.1209, lng: 85.3647, pinCode: '842001', isValidated: true },
  { name: 'Begusarai', formattedAddress: 'Begusarai, Bihar 851101, India', lat: 25.4182, lng: 86.1272, pinCode: '851101', isValidated: true },
  { name: 'Patna', formattedAddress: 'Patna, Bihar 800001, India', lat: 25.6093, lng: 85.1376, pinCode: '800001', isValidated: true },
  { name: 'Bhagalpur', formattedAddress: 'Bhagalpur, Bihar 812001, India', lat: 25.2425, lng: 86.9842, pinCode: '812001', isValidated: true },
  { name: 'Purnia', formattedAddress: 'Purnia, Bihar 854301, India', lat: 25.7781, lng: 87.4699, pinCode: '854301', isValidated: true },
  { name: 'Sitamarhi', formattedAddress: 'Sitamarhi, Bihar 843302, India', lat: 26.5877, lng: 85.4840, pinCode: '843302', isValidated: true },
  { name: 'Varanasi', formattedAddress: 'Varanasi, Uttar Pradesh 221001, India', lat: 25.3176, lng: 83.0064, pinCode: '221001', isValidated: true },
  { name: 'Lucknow', formattedAddress: 'Lucknow, Uttar Pradesh 226001, India', lat: 26.8467, lng: 80.9462, pinCode: '226001', isValidated: true },
  { name: 'Jaipur', formattedAddress: 'Jaipur, Rajasthan 302001, India', lat: 26.9124, lng: 75.7873, pinCode: '302001', isValidated: true },
  { name: 'Ranchi', formattedAddress: 'Ranchi, Jharkhand 834001, India', lat: 23.3441, lng: 85.3096, pinCode: '834001', isValidated: true },
  { name: 'Gaya', formattedAddress: 'Gaya, Bihar 823001, India', lat: 24.7955, lng: 84.9994, pinCode: '823001', isValidated: true },
  { name: 'Arrah', formattedAddress: 'Arrah, Bihar 802301, India', lat: 25.5512, lng: 84.6713, pinCode: '802301', isValidated: true },
];

/* ────────── Geocoding engines ────────── */

async function geocodeGoogle(
  query: string,
  apiKey: string,
): Promise<GeoResult[]> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    query,
  )}&key=${apiKey}&components=country:IN&language=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google API ${res.status}`);
  const data: {
    results: Array<{
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
      address_components: Array<{ types: string[]; long_name: string }>;
    }>;
  } = await res.json();
  return (data.results ?? []).slice(0, 6).map((r) => {
    const pinComp = r.address_components.find((c) =>
      c.types.includes('postal_code'),
    );
    const nameComp =
      r.address_components.find((c) => c.types.includes('locality')) ??
      r.address_components.find((c) =>
        c.types.includes('administrative_area_level_2'),
      );
    return {
      name: nameComp?.long_name ?? r.formatted_address.split(',')[0],
      formattedAddress: r.formatted_address,
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
      pinCode: pinComp?.long_name,
      isValidated: !!pinComp,
    };
  });
}

function geocodeFallback(query: string): GeoResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const matches = FALLBACK_VILLAGES.filter(
    (v) =>
      v.name.toLowerCase().includes(q) ||
      v.formattedAddress.toLowerCase().includes(q) ||
      (v.pinCode && v.pinCode.includes(q)),
  );
  if (matches.length > 0) return matches.slice(0, 6);

  // Generate a synthetic result so the user always sees something
  const hash = [...q].reduce((a, c) => a + c.charCodeAt(0), 0);
  const synLat = 25 + (hash % 400) / 100;
  const synLng = 80 + (hash % 800) / 100;
  return [
    {
      name: query.trim(),
      formattedAddress: `${query.trim()}, India`,
      lat: synLat,
      lng: synLng,
      pinCode: undefined,
      isValidated: false,
    },
  ];
}

/* ────────── Inline styles ────────── */

const S = {
  wrapper: {
    position: 'relative' as const,
    width: '100%',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: 6,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  },
  inputWrap: (focused: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    borderRadius: 16,
    background: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    border: focused
      ? '1.5px solid rgba(34, 211, 238, 0.7)'
      : '1px solid rgba(148, 163, 184, 0.18)',
    boxShadow: focused
      ? '0 0 20px rgba(34, 211, 238, 0.15), inset 0 1px 0 rgba(255,255,255,0.04)'
      : 'inset 0 1px 0 rgba(255,255,255,0.04)',
    transition: 'all 0.25s ease',
  }),
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: 500,
    letterSpacing: '0.01em',
  },
  dropdown: {
    position: 'absolute' as const,
    top: 'calc(100% + 6px)',
    left: 0,
    right: 0,
    zIndex: 50,
    borderRadius: 16,
    background: 'rgba(15, 23, 42, 0.88)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(148, 163, 184, 0.15)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
    overflow: 'hidden',
    maxHeight: 320,
    overflowY: 'auto' as const,
  },
  suggestion: (hovered: boolean) => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    background: hovered ? 'rgba(34, 211, 238, 0.08)' : 'transparent',
    borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
  }),
  suggestionIcon: (validated: boolean) => ({
    marginTop: 2,
    color: validated ? '#22d3ee' : '#f59e0b',
    flexShrink: 0,
  }),
  suggestionName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: 2,
  },
  suggestionAddr: {
    fontSize: 12,
    color: '#94a3b8',
  },
  pinBadge: (valid: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 6,
    marginTop: 4,
    background: valid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
    color: valid ? '#4ade80' : '#fbbf24',
    border: `1px solid ${valid ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
  }),
  selectedCard: {
    marginTop: 10,
    padding: '14px 16px',
    borderRadius: 16,
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(34, 211, 238, 0.18)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  cardRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  cardName: {
    fontSize: 15,
    fontWeight: 700,
    color: '#f1f5f9',
  },
  cardAddr: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  metaRow: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    marginTop: 4,
  },
  metaChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12,
    fontWeight: 500,
    color: '#cbd5e1',
    padding: '3px 10px',
    borderRadius: 8,
    background: 'rgba(148, 163, 184, 0.08)',
    border: '1px solid rgba(148, 163, 184, 0.12)',
  },
  costLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 12,
    fontWeight: 600,
    color: '#22d3ee',
    padding: '3px 10px',
    borderRadius: 8,
    background: 'rgba(34, 211, 238, 0.08)',
    border: '1px solid rgba(34, 211, 238, 0.15)',
  },
  changeBtn: {
    background: 'rgba(148, 163, 184, 0.12)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: 600,
    padding: '5px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  validationBadge: (valid: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12,
    fontWeight: 600,
    marginTop: 8,
    color: valid ? '#4ade80' : '#fbbf24',
  }),
  loadingWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '18px 0',
  },
  noResults: {
    padding: '14px 16px',
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center' as const,
  },
} as const;

/* ────────── Component ────────── */

export const SmartAddressInput: React.FC<SmartAddressInputProps> = ({
  label,
  placeholder = 'Search village, city or PIN code…',
  onSelect,
  originLocation,
  apiKey,
  className,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState<GeoResult | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Debounced geocode */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      setError(null);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (val.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          let results: GeoResult[];
          if (apiKey) {
            results = await geocodeGoogle(val, apiKey);
          } else {
            results = geocodeFallback(val);
          }
          setSuggestions(
            results.map((r) => enrichWithDistance(r, originLocation)),
          );
        } catch (err) {
          console.error('SmartAddressInput geocode error:', err);
          setError('Unable to fetch addresses. Using fallback…');
          setSuggestions(
            geocodeFallback(val).map((r) =>
              enrichWithDistance(r, originLocation),
            ),
          );
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [apiKey, originLocation],
  );

  const handleSelect = useCallback(
    (result: GeoResult) => {
      const enriched = enrichWithDistance(result, originLocation);
      setSelected(enriched);
      setSuggestions([]);
      setQuery('');
      onSelect(enriched);
    },
    [onSelect, originLocation],
  );

  const handleReopen = useCallback(() => {
    setSelected(null);
    setQuery('');
    setSuggestions([]);
  }, []);

  /* ── Render ── */

  const showDropdown =
    !selected && (suggestions.length > 0 || loading || error);

  return (
    <div
      ref={wrapperRef}
      style={S.wrapper}
      className={className}
    >
      {/* Label */}
      <span style={S.label}>{label}</span>

      {/* Input row (hidden when selected) */}
      {!selected && (
        <div style={S.inputWrap(focused)}>
          <Search size={18} color={focused ? '#22d3ee' : '#64748b'} />
          <input
            style={S.input}
            placeholder={placeholder}
            value={query}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {loading && (
            <Loader2
              size={18}
              color="#22d3ee"
              style={{ animation: 'spin 0.8s linear infinite' }}
            />
          )}
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div style={S.dropdown}>
          {loading && (
            <div style={S.loadingWrap}>
              <Loader2
                size={22}
                color="#22d3ee"
                style={{ animation: 'spin 0.8s linear infinite' }}
              />
            </div>
          )}

          {!loading && error && <div style={S.noResults}>{error}</div>}

          {!loading &&
            suggestions.map((s, i) => (
              <div
                key={`${s.lat}-${s.lng}-${i}`}
                style={S.suggestion(hoveredIdx === i)}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(-1)}
                onClick={() => handleSelect(s)}
              >
                <div style={S.suggestionIcon(s.isValidated)}>
                  {s.isValidated ? (
                    <Check size={16} />
                  ) : (
                    <AlertTriangle size={16} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.suggestionName}>{s.name}</div>
                  <div style={S.suggestionAddr}>{s.formattedAddress}</div>
                  {s.pinCode && (
                    <span style={S.pinBadge(true)}>{s.pinCode}</span>
                  )}
                  {!s.pinCode && (
                    <span style={S.pinBadge(false)}>No PIN</span>
                  )}
                </div>
              </div>
            ))}

          {!loading && suggestions.length === 0 && !error && (
            <div style={S.noResults}>No results found</div>
          )}
        </div>
      )}

      {/* Selected card */}
      {selected && (
        <>
          <div style={S.selectedCard}>
            <div style={S.cardRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.cardName}>
                  <MapPin
                    size={14}
                    style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }}
                    color="#22d3ee"
                  />
                  {selected.name}
                </div>
                <div style={S.cardAddr}>{selected.formattedAddress}</div>
              </div>
              <button
                type="button"
                style={S.changeBtn}
                onClick={handleReopen}
                onMouseEnter={(e) => {
                  (e.currentTarget.style.background =
                    'rgba(34, 211, 238, 0.12)');
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget.style.background =
                    'rgba(148, 163, 184, 0.12)');
                }}
              >
                Change
              </button>
            </div>

            {/* Badges row */}
            <div style={S.metaRow}>
              {/* PIN badge */}
              <span style={S.pinBadge(!!selected.pinCode)}>
                {selected.pinCode ?? 'No PIN'}
              </span>

              {/* Distance + Duration */}
              {selected.distanceKm != null && (
                <span style={S.metaChip}>
                  <Navigation size={12} />
                  {selected.distanceKm} km
                </span>
              )}
              {selected.durationMinutes != null && (
                <span style={S.metaChip}>
                  ~{selected.durationMinutes} min
                </span>
              )}

              {/* Cost estimate */}
              {selected.distanceKm != null && (
                <span style={S.costLabel}>
                  ₹{Math.round(selected.distanceKm * COST_PER_KM)}
                </span>
              )}
            </div>
          </div>

          {/* Validation badge */}
          <div style={S.validationBadge(selected.isValidated)}>
            {selected.isValidated ? (
              <>
                <Check size={14} /> Address Verified
              </>
            ) : (
              <>
                <AlertTriangle size={14} /> Incomplete Address
              </>
            )}
          </div>
        </>
      )}

      {/* Keyframe for spinner (injected once) */}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};
