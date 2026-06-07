import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapConfig {
  center: [number, number];
  zoom: number;
  markers?: Array<{
    position: [number, number];
    popup?: string;
  }>;
}

interface Props {
  config: MapConfig;
}

const MapRenderer: React.FC<Props> = ({ config }) => {
  const center = config.center || [-6.2088, 106.8456];
  const zoom = config.zoom || 13;

  return (
    <div className="my-4 w-full h-[400px] rounded-xl overflow-hidden border border-gray-200 shadow-sm relative" style={{ minHeight: '400px' }}>
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {config.markers && config.markers.map((marker, idx) => (
          <Marker key={idx} position={marker.position}>
            {marker.popup && <Popup>{marker.popup}</Popup>}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapRenderer;
