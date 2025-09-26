import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Feature, FeatureCollection, Geometry } from 'geojson';
import * as togeojson from '@tmcw/togeojson';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

// Fix default marker paths using new URL (avoids TS module declarations for images)
const marker2x = new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString();
const marker1x = new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString();
const markerShadow = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString();
L.Icon.Default.mergeOptions({ iconRetinaUrl: marker2x, iconUrl: marker1x, shadowUrl: markerShadow });

export interface ZoneProperties {
  name?: string;
  [k: string]: any;
}

interface DeliveryZonesKmlMapProps {
  kmlUrl: string; // path in public folder e.g. /zones/sawani-zones.kml
  onZoneMatch?: (zoneName: string | null) => void;
  className?: string;
  style?: React.CSSProperties;
}

const RiyadhCenter: [number, number] = [24.7136, 46.6753];

// Separate component to attach click handler & invalidate size (instead of whenCreated prop)
const MapEnhancer: React.FC<{ onClick: (e: L.LeafletMouseEvent) => void }> = ({ onClick }) => {
  const map = useMap();
  useEffect(() => {
    map.on('click', onClick);
    // ensure map renders correctly in flex/dialog containers
    setTimeout(() => map.invalidateSize(), 0);
    return () => { map.off('click', onClick); };
  }, [map, onClick]);
  return null;
};

const FitBounds: React.FC<{ fc: FeatureCollection | null }> = ({ fc }) => {
  const map = useMap();
  useEffect(() => {
    if (!fc || !fc.features.length) return;
    const bounds = L.latLngBounds([]);
    fc.features.forEach(f => {
      const g: any = f.geometry;
      const addCoords = (coords: any) => {
        if (typeof coords[0] === 'number') {
          bounds.extend([coords[1], coords[0]]); // GeoJSON lon,lat -> Leaflet lat,lng
        } else {
          coords.forEach(addCoords);
        }
      };
      if (g.type === 'Polygon') addCoords(g.coordinates);
      if (g.type === 'MultiPolygon') addCoords(g.coordinates);
    });
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.05));
  }, [fc, map]);
  return null;
};

export const DeliveryZonesKmlMap: React.FC<DeliveryZonesKmlMapProps> = ({ kmlUrl, onZoneMatch, className, style }) => {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clickedResult, setClickedResult] = useState<string | null>(null);
  const colorCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true); setError(null);
        const resp = await fetch(kmlUrl);
        if (!resp.ok) throw new Error('Failed to fetch KML');
        const text = await resp.text();
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(text, 'text/xml');
        const converted = togeojson.kml(kmlDoc) as FeatureCollection;
        setGeojson(converted);
      } catch (e: any) {
        setError(e.message || 'Failed to load zones');
      } finally { setLoading(false); }
    };
    load();
  }, [kmlUrl]);

  const randomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue} 70% 50% / 0.35)`;
  };

  const onEachFeature = (feature: Feature<Geometry, ZoneProperties>, layer: L.Layer) => {
    if (feature.properties) {
      const name = feature.properties.name || 'Unnamed Zone';
      layer.bindPopup(`<strong>${name}</strong>`);
    }
  };

  const styleFn = (feature?: Feature<Geometry, ZoneProperties>) => {
    const name = feature?.properties?.name || 'Unnamed Zone';
    if (!colorCache.current.has(name)) {
      colorCache.current.set(name, randomColor());
    }
    const fillColor = colorCache.current.get(name)!;
    return {
      color: '#444',
      weight: 1,
      fillColor,
      fillOpacity: 0.5,
    } as L.PathOptions;
  };

  const handleClick = (e: L.LeafletMouseEvent) => {
    if (!geojson) return;
    const pt = point([e.latlng.lng, e.latlng.lat]);
    let matched: string | null = null;
    for (const f of geojson.features) {
      if (f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')) {
        if (booleanPointInPolygon(pt, f as any)) {
          matched = (f.properties as any)?.name || 'Unnamed Zone';
          break;
        }
      }
    }
    setClickedResult(matched);
    onZoneMatch?.(matched);
  };

  return (
    <div className={className} style={style}>
      {loading && <div className="text-xs text-muted-foreground mb-2">Loading zones…</div>}
      {error && <div className="text-xs text-red-600 mb-2">{error}</div>}
      <MapContainer center={RiyadhCenter} zoom={11} scrollWheelZoom style={{ height: '500px', width: '100%', borderRadius: 6 }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
          subdomains={['a','b','c','d']}
          maxZoom={20}
        />
        <MapEnhancer onClick={handleClick} />
        {geojson && <GeoJSON data={geojson as any} onEachFeature={onEachFeature} style={styleFn as any} />}
        <FitBounds fc={geojson} />
      </MapContainer>
      <div className="mt-2 text-sm">
        {clickedResult === null ? 'Click the map to test a point.' : clickedResult ? (
          <span>Inside zone: <strong>{clickedResult}</strong></span>
        ) : (
          <span className="text-muted-foreground">Outside delivery zone</span>
        )}
      </div>
    </div>
  );
};

export default DeliveryZonesKmlMap;
