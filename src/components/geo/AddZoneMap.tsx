import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMapEvents, Marker } from 'react-leaflet';
import { Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as toGeoJSON from 'togeojson';
import { useToast } from '@/hooks/use-toast';

type Props = {
  kmlUrl?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
  onPointsChange?: (points: { latitude: number; longitude: number }[]) => void;
  // incoming points from parent (e.g. after importing a KML file)
  initialPoints?: { latitude: number; longitude: number }[];
  // when this numeric prop increments, the map should clear all points
  resetCounter?: number;
  // whether the surrounding dialog/sheet is currently visible; helps with invalidateSize
  isVisible?: boolean;
};

// reuse ray-casting helpers (copy minimal implementations)
function pointInRing(point: [number, number], ring: number[][]) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 0.0) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInGeoJSON(pointLatLng: [number, number], geometry: any): boolean {
  const pt: [number, number] = [pointLatLng[1], pointLatLng[0]]; // [lng, lat]
  if (!geometry) return false;
  const type = geometry.type;
  const coords = geometry.coordinates;
  if (type === 'Polygon') {
    if (pointInRing(pt, coords[0])) {
      for (let i = 1; i < coords.length; i++) if (pointInRing(pt, coords[i])) return false;
      return true;
    }
    return false;
  } else if (type === 'MultiPolygon') {
    for (const poly of coords) {
      if (pointInRing(pt, poly[0])) {
        let inHole = false;
        for (let i = 1; i < poly.length; i++) if (pointInRing(pt, poly[i])) { inHole = true; break; }
        if (!inHole) return true;
      }
    }
    return false;
  }
  return false;
}

const palette = ['#2b7bba', '#e63946', '#f4a261', '#2a9d8f', '#8a2be2', '#ff6b6b', '#4cc9f0'];

export default function AddZoneMap({ kmlUrl = '/Sawani Zones.kml', initialCenter = [24.7136, 46.6753], initialZoom = 11, onPointsChange, resetCounter, isVisible, initialPoints }: Props) {
  const { toast } = useToast();
  const [geojson, setGeojson] = useState<any | null>(null);
  // Points passed to parent: now represent the selected zone polygon coordinates (outer ring)
  const [points, setPoints] = useState<{ latitude: number; longitude: number }[]>([]);
  // Selected feature index (from properties.__zoneIndex) when user selects a zone
  const [selectedZoneIndex, setSelectedZoneIndex] = useState<number | null>(null);
  // Single marker at the click location to indicate the selected zone
  const [selectedClick, setSelectedClick] = useState<{ lat: number; lng: number } | null>(null);
  // no per-pin popup tracking in selection mode
  const mapRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const lastReset = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(kmlUrl);
        if (!res.ok) return;
        const text = await res.text();
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(text, 'application/xml');
        const gj = (toGeoJSON as any).kml(kmlDoc);
        const features = (gj && gj.features) ? gj.features.filter((f: any) => {
          const t = f?.geometry?.type;
          return t === 'Polygon' || t === 'MultiPolygon';
        }) : [];
        features.forEach((f: any, i: number) => { f.properties = f.properties || {}; f.properties.__zoneIndex = i; });
        if (!cancelled) setGeojson({ type: 'FeatureCollection', features });
      } catch (err) {
        console.error('Failed to load KML for AddZoneMap', err);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [kmlUrl]);

  // Apply any incoming initialPoints from parent (for example, after importing a KML file).
  // Only accept points that fall inside a delivery zone polygon. If geojson is not loaded yet,
  // this effect will re-run once geojson becomes available (because initialPoints is stable
  // in the parent and this effect depends on geojson).
  useEffect(() => {
    if (!initialPoints || initialPoints.length === 0) return;
    if (!geojson || !geojson.features) {
      // wait for geojson to be available; do nothing now. This effect will run again when geojson is set.
      return;
    }
    // filter to points that are inside any polygon
    const filtered = initialPoints.filter(p => {
      return geojson.features.some((f:any) => pointInGeoJSON([p.latitude, p.longitude], f.geometry));
    });
    if (filtered.length === 0) {
      toast({ title: 'Import result', description: 'No points inside delivery zones were found in the file.', variant: 'default' });
      return;
    }
    // In the new flow, initialPoints aren't typical, but if provided, set them as-is
    setPoints(filtered);
  }, [initialPoints, geojson, toast]);

  // If parent provides initialPoints (for example after importing a KML), accept them
  // but only keep points that fall inside known delivery zone polygons.
  // If geojson hasn't loaded yet, keep them pending and apply when available.
  useEffect(() => {
    // read from a specially-named prop passed via arguments object (not ideal but keeps types unchanged)
    // NOTE: Because TS won't let us access props not listed, we read via arguments[0] trick
    // However this file declares Props above so we'll instead rely on the fact that callers
    // pass `initialPoints` and we can access it via this function's parameters only if added above.
  }, []);

  // Helper: find the outer ring of the polygon (or sub-polygon) that contains the given point
  function findContainingRing(lat: number, lng: number): { ring: number[][] | null; zoneIndex: number | null } {
    if (!geojson || !geojson.features) return { ring: null, zoneIndex: null };
    const ptLngLat: [number, number] = [lng, lat];
    for (const f of geojson.features) {
      const zIdx = f?.properties?.__zoneIndex ?? null;
      const g = f?.geometry;
      if (!g || !g.type || !g.coordinates) continue;
      if (g.type === 'Polygon') {
        const rings: number[][][] = g.coordinates;
        const outer = rings?.[0];
        if (outer && pointInRing(ptLngLat, outer)) {
          // Exclude holes
          let inHole = false;
          for (let i = 1; i < rings.length; i++) { if (pointInRing(ptLngLat, rings[i])) { inHole = true; break; } }
          if (!inHole) return { ring: outer, zoneIndex: zIdx };
        }
      } else if (g.type === 'MultiPolygon') {
        const polys: number[][][][] = g.coordinates;
        for (const poly of polys) {
          const outer = poly?.[0];
          if (outer && pointInRing(ptLngLat, outer)) {
            let inHole = false;
            for (let i = 1; i < poly.length; i++) { if (pointInRing(ptLngLat, poly[i])) { inHole = true; break; } }
            if (!inHole) return { ring: outer, zoneIndex: zIdx };
          }
        }
      }
    }
    return { ring: null, zoneIndex: null };
  }

  function ClickHandler() {
    useMapEvents({ click(e) {
      const lat = e.latlng.lat, lng = e.latlng.lng;
      if (!geojson || !geojson.features) return;
      const { ring, zoneIndex } = findContainingRing(lat, lng);
      if (!ring || zoneIndex == null) {
        toast({ title: 'Select a delivery zone', description: 'Click inside a colored zone to select it.', variant: 'default' });
        return;
      }
      // Convert ring [ [lng,lat], ... ] to list of { latitude, longitude }
      const polyPoints = ring.map(([lngPt, latPt]) => ({ latitude: latPt, longitude: lngPt }));
      setSelectedZoneIndex(zoneIndex);
      setSelectedClick({ lat, lng });
      setPoints(polyPoints);
      
    }});
    return null;
  }

  const styleFn = (feature: any, idx: number) => {
    const zIdx = feature?.properties?.__zoneIndex ?? idx;
    const isSelected = selectedZoneIndex != null && zIdx === selectedZoneIndex;
    return { color: palette[idx % palette.length], weight: isSelected ? 2.5 : 1.5, opacity: 1, fillOpacity: isSelected ? 0.22 : 0.12 } as L.PathOptions;
  };

  const getZoneName = (feature: any) => {
    const props = feature?.properties || {};
    return (
      props.name || props.Name || props.zone_name || props.title || props.Title || `Zone #${(props.__zoneIndex ?? 0) + 1}`
    );
  };

  const onEachFeature = (feature: any, layer: L.Layer) => {
    const name = getZoneName(feature);
    if ((layer as any).bindTooltip) {
      (layer as any).bindTooltip(String(name), { sticky: true });
    }
    if ((layer as any).on) {
      (layer as any).on('mouseover', () => {
        // Subtle hover highlight
        (layer as any).setStyle?.({ weight: 2.5, fillOpacity: 0.22 });
      });
      (layer as any).on('mouseout', () => {
        const idx = feature?.properties?.__zoneIndex ?? 0;
        const s = styleFn(feature, idx) as any;
        (layer as any).setStyle?.(s);
      });
    }
  };

  function MapSetter() {
    const map = (useMapEvents({}) as unknown) as L.Map;
    useEffect(() => {
      if (map) {
        mapRef.current = map;
        setMapReady(true);
      }
    }, [map]);
    return null;
  }

  // Use specified red marker image
  const redIcon = useMemo(() => {
    const markerShadow = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString();
    return new L.Icon({
      iconRetinaUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-red.png',
      iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-red.png',
      shadowUrl: markerShadow,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
  }, []);

  // Notify parent after points state has updated (post-render) to avoid setState-in-render
  useEffect(() => {
    onPointsChange?.(points);
  }, [points, onPointsChange]);

  // Respond to external reset requests: clear points when resetCounter increments
  useEffect(() => {
    if (typeof resetCounter === 'number') {
      if (lastReset.current === undefined || resetCounter !== lastReset.current) {
        lastReset.current = resetCounter;
  setPoints([]);
  setSelectedZoneIndex(null);
  setSelectedClick(null);
      }
    }
  }, [resetCounter]);

  // When map is ready or becomes visible (dialog opened), fix layout
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    const invalidate = () => map.invalidateSize();
    // small delay to allow dialog animation to finish
    const id = window.setTimeout(invalidate, 120);
    return () => window.clearTimeout(id);
  }, [mapReady]);

  useEffect(() => {
    if (!mapReady || !isVisible) return;
    const map = mapRef.current;
    if (!map) return;
    const id = window.setTimeout(() => map.invalidateSize(), 150);
    return () => window.clearTimeout(id);
  }, [isVisible, mapReady]);

  return (
    <div className="h-64">
      <MapContainer center={initialCenter} zoom={initialZoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap contributors &copy; CARTO' />
        <MapSetter />
        {geojson && (
          <GeoJSON
            data={geojson}
            style={(f:any) => {
              const idx = f?.properties?.__zoneIndex ?? 0;
              return styleFn(f, idx);
            }}
            onEachFeature={onEachFeature as any}
          />
        )}
        <ClickHandler />
        {selectedClick && (
          <Marker position={[selectedClick.lat, selectedClick.lng]} icon={redIcon} zIndexOffset={1000} riseOnHover={true}>
            <Popup>
              <div className="text-xs">
                <div className="font-semibold">Zone selected</div>
                <div className="mt-1">Vertices: {points.length}</div>
                <div className="mt-2">
                  <button
                    className="text-red-600 text-xs"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setSelectedZoneIndex(null);
                      setSelectedClick(null);
                      setPoints([]);
                    }}
                  >
                    Clear selection
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
