import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMapEvents, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// togeojson is small and converts KML DOM -> GeoJSON
import * as toGeoJSON from 'togeojson';

type Props = {
  kmlUrl?: string;
  kmlText?: string;
  className?: string;
  style?: React.CSSProperties;
  onSelect?: (feature: any | null, message?: string) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  locations?: { latitude: number; longitude: number }[];
};

// simple point-in-polygon for one ring (ray casting). coords are [lng, lat]
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
  // normalize point to [lng, lat]
  const pt: [number, number] = [pointLatLng[1], pointLatLng[0]];
  if (!geometry) return false;
  const type = geometry.type;
  const coords = geometry.coordinates;
  if (type === 'Polygon') {
    // Polygon: coords = [ [ring1], [hole1], ... ] ; check outer ring then holes
    if (pointInRing(pt, coords[0])) {
      // ensure not in any hole
      for (let i = 1; i < coords.length; i++) {
        if (pointInRing(pt, coords[i])) return false;
      }
      return true;
    }
    return false;
  } else if (type === 'MultiPolygon') {
    // coords = [ [ [ring] ] , ... ]
    for (const poly of coords) {
      if (pointInRing(pt, poly[0])) {
        // check holes
        let inHole = false;
        for (let i = 1; i < poly.length; i++) {
          if (pointInRing(pt, poly[i])) { inHole = true; break; }
        }
        if (!inHole) return true;
      }
    }
    return false;
  }
  return false;
}

const palette = [
  '#2b7bba', '#e63946', '#f4a261', '#2a9d8f', '#8a2be2', '#ff6b6b', '#4cc9f0'
];

export default function DeliveryZonesKmlMap({ kmlUrl, kmlText, className, onSelect, initialCenter = [24.7136, 46.6753], initialZoom = 11, locations }: Props) {
  const [geojson, setGeojson] = useState<any | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [clickMarker, setClickMarker] = useState<L.Marker | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  // keep refs to GeoJSON feature layers so we can update style programmatically
  const featureLayerRefs = useRef<Record<number, L.Layer>>({});
  // red marker icon (small standard leaflet red marker)
  const markerShadow = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString();
  const redIcon = new L.Icon({
    iconRetinaUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-red.png',
    iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-red.png',
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  // When locations (zone coordinates) are provided, fit the map to their bounds for better visibility
  useEffect(() => {
    if (!mapRef.current) return;
    if (!Array.isArray(locations) || locations.length === 0) return;
    try {
      const bounds = L.latLngBounds(locations.map(p => L.latLng(p.latitude, p.longitude)));
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [16, 16] });
      }
    } catch {}
  }, [locations]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        let text = kmlText;
        if (!text && kmlUrl) {
          const res = await fetch(encodeURI(kmlUrl), { cache: 'no-store' });
          if (!res.ok) throw new Error('Failed to fetch KML');
          text = await res.text();
        }
        if (!text) return;
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(text, 'application/xml');
        const gj = (toGeoJSON as any).kml(kmlDoc);
        if (!cancelled) {
          // filter to polygons only (ignore points/lines)
          try {
            const features = (gj && gj.features) ? gj.features.filter((f: any) => {
              const t = f?.geometry?.type;
              return t === 'Polygon' || t === 'MultiPolygon';
            }) : [];
            // assign stable index on each feature so style callbacks can read it
            features.forEach((f: any, i: number) => {
              f.properties = f.properties || {};
              f.properties.__zoneIndex = i;
            });
            setGeojson({ type: 'FeatureCollection', features });
          } catch (err) {
            setGeojson(gj);
          }
        }
      } catch (err) {
        console.error('Failed to load KML', err);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [kmlUrl, kmlText]);

  const onMapClick = (latlng: [number, number]) => {
    if (!geojson || !geojson.features) {
      setSelectedIndex(null);
      onSelect?.(null, 'No zones loaded');
      return;
    }
    const foundIndex = geojson.features.findIndex((f: any) => {
      return pointInGeoJSON(latlng, f.geometry);
    });
    if (foundIndex >= 0) {
      setSelectedIndex(foundIndex);
      const name = geojson.features[foundIndex].properties?.name || geojson.features[foundIndex].properties?.Name || `Zone ${foundIndex+1}`;
      onSelect?.(geojson.features[foundIndex], `Inside zone: ${name}`);
    } else {
      setSelectedIndex(null);
      onSelect?.(null, 'Outside delivery zone');
    }

    // add or move a FontAwesome divIcon marker at the clicked location
    try {
      if (!mapRef.current) return;
      // remove previous marker
      if (clickMarker) {
        clickMarker.remove();
        setClickMarker(null);
      }
      const faHtml = `<i class="fa-solid fa-location-dot" style="color:#e63946;font-size:24px;text-shadow:0 1px 2px rgba(0,0,0,0.5)"></i>`;
      const icon = L.divIcon({ className: 'delivery-click-icon', html: faHtml, iconAnchor: [12, 24] });
      const m = L.marker([latlng[0], latlng[1]], { icon }).addTo(mapRef.current);
      setClickMarker(m);
      // pan the map slightly to ensure marker visibility on small containers
      mapRef.current.panTo([latlng[0], latlng[1]]);
    } catch (err) {
      console.warn('Failed to place click marker', err);
    }
  };

  function ClickHandler() {
    useMapEvents({
      click(e) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    });
    return null;
  }

  // capture the map instance so we can programmatically add markers
  function MapSetter() {
    const map = (useMapEvents({}) as unknown) as L.Map;
    useEffect(() => { if (map) mapRef.current = map; }, [map]);
    return null;
  }

  const geoJsonLayer = useMemo(() => {
    if (!geojson) return null;
    return geojson;
  }, [geojson]);

  const styleFn = (_feature: any, idx: number) => {
    const color = palette[idx % palette.length];
    return {
      color,
      weight: selectedIndex === idx ? 3.5 : 1.5,
      opacity: 1,
      fillColor: color,
      fillOpacity: selectedIndex === idx ? 0.25 : 0.15
    } as any;
  };

  // reset style of a previously selected feature
  const resetPrevious = (prevIndex: number | null) => {
    if (prevIndex == null) return;
    const layer = featureLayerRefs.current[prevIndex];
    if (layer && (layer as any).setStyle) {
      const idx = prevIndex;
      const base = styleFn(null, idx);
      (layer as any).setStyle(base);
      try { (layer as any).bringToBack(); } catch (e) {}
    }
  };

  const highlightFeature = (idx: number) => {
    const layer = featureLayerRefs.current[idx];
    if (layer && (layer as any).setStyle) {
      (layer as any).setStyle({ color: '#ffffff', weight: 3.5, fillOpacity: 0.25 });
      try { (layer as any).bringToFront(); } catch (e) {}
    }
  };

  return (
    <div className={className} style={{ height: '100%', ...((className || '') ? {} : {} ) }}>
  <MapContainer center={initialCenter} zoom={initialZoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />
        <MapSetter />
        <ClickHandler />
        {geoJsonLayer && (
          <GeoJSON data={geoJsonLayer} style={(feature:any) => {
            // feature is the GeoJSON Feature passed by react-leaflet
            const idx = feature?.properties?.__zoneIndex ?? geoJsonLayer.features.indexOf(feature);
            const st = styleFn(feature, idx);
            return st;
          }} onEachFeature={(feature, layer) => {
            const idx = (feature as any).properties?.__zoneIndex ?? geoJsonLayer.features.indexOf(feature as any);
            // store layer reference
            featureLayerRefs.current[idx] = layer;
            // bind popup from name if present
            const name = feature.properties?.name || feature.properties?.Name || '';
            if (name) layer.bindPopup(String(name));
            // attach click handler per layer to highlight and notify
            layer.on('click', (e: any) => {
              // reset previous
              const prev = selectedIndex;
              if (prev !== null && prev !== idx) resetPrevious(prev);
              setSelectedIndex(idx);
              highlightFeature(idx);
              const nm = name || `Zone ${idx+1}`;
              onSelect?.(feature, `Inside zone: ${nm}`);
              // place click marker at event latlng
              try {
                if (!mapRef.current) return;
                if (clickMarker) { clickMarker.remove(); setClickMarker(null); }
                const latlng = e.latlng || (e?.target?.getBounds ? e.target.getBounds().getCenter() : null);
                if (latlng) {
                  const faHtml = `<i class="fa-solid fa-location-dot" style="color:#e63946;font-size:24px;text-shadow:0 1px 2px rgba(0,0,0,0.5)"></i>`;
                  const icon = L.divIcon({ className: 'delivery-click-icon', html: faHtml, iconAnchor: [12, 24] });
                  const m = L.marker([latlng.lat, latlng.lng], { icon }).addTo(mapRef.current);
                  setClickMarker(m);
                }
              } catch (err) {
                console.warn('Failed to place layer click marker', err);
              }
            });
          }} />
        )}
        {/* render provided location pins */}
        {Array.isArray(locations) && locations.map((loc, i) => (
          <Marker key={i} position={[loc.latitude, loc.longitude]} icon={redIcon as any} zIndexOffset={1000}>
            <Tooltip direction="top" offset={[0, -6]} opacity={0.9} permanent={false}>
              Vertex {i + 1}
            </Tooltip>
            <Popup className="text-xs">{`Lat: ${loc.latitude}, Lng: ${loc.longitude}`}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
