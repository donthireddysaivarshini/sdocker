import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for old age homes
const homeIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjNUQ2RjQ3Ij48cGF0aCBkPSJNMTIgMkw0IDlWMjFIMTBWMTVIMTRWMjFIMjBWOUwxMiAyWiIvPjwvc3ZnPg==',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Center map on markers
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

const MapView = ({ homes, center, radius }) => {
  const defaultCenter = center || [20.5937, 78.9629]; // India center
  const defaultZoom = center ? 12 : 5;

  return (
    <div className="rounded-lg overflow-hidden shadow-lg relative z-0" style={{ height: '500px' }}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%', position: 'relative', zIndex: 1 }}
        scrollWheelZoom={true}
      >
        <ChangeView center={defaultCenter} zoom={defaultZoom} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Search center marker */}
        {center && (
          <>
            <Marker position={center}>
              <Popup>
                <strong>Search Center</strong>
              </Popup>
            </Marker>
            {radius && (
              <Circle
                center={center}
                radius={radius * 1000}
                pathOptions={{
                  color: '#5D6F47',
                  fillColor: '#5D6F47',
                  fillOpacity: 0.1,
                }}
              />
            )}
          </>
        )}
        
        {/* Old age home markers */}
        {homes && homes.map((home) => (
          home.latitude && home.longitude && (
            <Marker
              key={home.id}
              position={[home.latitude, home.longitude]}
              icon={homeIcon}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold', color: '#5D6F47' }}>
                    {home.organisation_name}
                  </h3>
                  <p style={{ margin: '4px 0', fontSize: '13px' }}>
                    <strong>📍</strong> {home.city_town_mandal && `${home.city_town_mandal}, `}
                    {home.district}, {home.state}
                  </p>
                  {home.distance_km && (
                    <p style={{ margin: '4px 0', fontSize: '13px', color: '#EDC750', fontWeight: 'bold' }}>
                      <strong>📏</strong> {home.distance_km.toFixed(2)} km away
                    </p>
                  )}
                  {home.contact_number && home.contact_number.length > 0 && (
                    <p style={{ margin: '4px 0', fontSize: '13px' }}>
                      <strong>📞</strong> {home.contact_number[0]}
                    </p>
                  )}
                  {home.costing_type && (
                    <p style={{ margin: '4px 0', fontSize: '13px', textTransform: 'capitalize' }}>
                      <strong>💰</strong> {home.costing_type.replace('_', ' & ')}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;
