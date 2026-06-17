import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { searchService } from '../services/api';
import MapView from './MapView';

const DetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [home, setHome] = useState(null);
  const [nearbyHomes, setNearbyHomes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const homeData = await searchService.getById(id);
        setHome(homeData);

        if (homeData.latitude && homeData.longitude) {
          const nearbyData = await searchService.nearby({
            lat: homeData.latitude,
            lng: homeData.longitude,
            radius: 20,
          });
          
          const filtered = nearbyData.results
            .filter(h => h.id !== homeData.id)
            .slice(0, 5);
          
          setNearbyHomes(filtered);
        }
      } catch (error) {
        console.error('Error fetching details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4" style={{ color: '#5D6F47' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="font-semibold" style={{ color: '#5D6F47' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!home) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Home not found</h2>
        <button
          onClick={() => navigate('/search')}
          className="inline-block px-10 py-3 rounded-lg font-semibold text-gray-900 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
          style={{ backgroundColor: '#EDC750' }}
        >
          Back to Search
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 px-4 py-2 bg-white rounded-lg font-semibold border border-gray-200 transition-all hover:bg-gray-50 hover:-translate-x-1 shadow-sm"
          style={{ color: '#5D6F47' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Results
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Home Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Info Card */}
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <h1 className="text-3xl font-bold mb-6" style={{ color: '#5D6F47' }}>
                {home.organisation_name}
              </h1>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Location */}
                <div>
                  <h3 className="text-lg font-bold mb-4 text-gray-800">Location</h3>
                  <div className="space-y-2">
                    {home.address && (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-gray-800">Address:</span>
                        <span className="text-sm text-gray-600">{home.address}</span>
                      </div>
                    )}
                    {home.city_town_mandal && (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-gray-800">City:</span>
                        <span className="text-sm text-gray-600">{home.city_town_mandal}</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-gray-800">District:</span>
                      <span className="text-sm text-gray-600">{home.district}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-gray-800">State:</span>
                      <span className="text-sm text-gray-600">{home.state}</span>
                    </div>
                    {home.pincode && (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-gray-800">Pincode:</span>
                        <span className="text-sm text-gray-600">{home.pincode}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div>
                  <h3 className="text-lg font-bold mb-4 text-gray-800">Contact</h3>
                  <div className="space-y-2">
                    {home.contact_number && home.contact_number.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-gray-800">Phone:</span>
                        <div className="mt-1 space-y-1">
                          {home.contact_number.map((num, idx) => (
                            <a
                              key={idx}
                              href={`tel:${num}`}
                              className="block text-sm transition-colors hover:underline"
                              style={{ color: '#5D6F47' }}
                            >
                              {num}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {home.email && home.email.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-gray-800">Email:</span>
                        <div className="mt-1 space-y-1">
                          {home.email.map((email, idx) => (
                            <a
                              key={idx}
                              href={`mailto:${email}`}
                              className="block text-sm transition-colors hover:underline"
                              style={{ color: '#5D6F47' }}
                            >
                              {email}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {home.website && home.website.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-gray-800">Website:</span>
                        <div className="mt-1 space-y-1">
                          {home.website.map((site, idx) => (
                            <a
                              key={idx}
                              href={site}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-sm transition-colors hover:underline"
                              style={{ color: '#5D6F47' }}
                            >
                              Visit Website ↗
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Services */}
                <div>
                  <h3 className="text-lg font-bold mb-4 text-gray-800">Services</h3>
                  <div className="space-y-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-gray-800">Type:</span>
                      <span className="text-sm text-gray-600 capitalize">{home.services_type}</span>
                    </div>
                    {home.care_type && (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-gray-800">Care Type:</span>
                        <span className="text-sm text-gray-600 capitalize">{home.care_type} Care</span>
                      </div>
                    )}
                    {home.gender && (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-gray-800">Gender:</span>
                        <span className="text-sm text-gray-600 capitalize">{home.gender}</span>
                      </div>
                    )}
                    {home.call_verification && (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-gray-800">Verification:</span>
                        <span className="text-sm text-gray-600">{home.call_verification}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing */}
                <div>
                  <h3 className="text-lg font-bold mb-4 text-gray-800">Pricing</h3>
                  <div className="space-y-3">
                    {home.costing_type && (
                      <div>
                        <span 
                          className="inline-block px-4 py-2 rounded-lg text-sm font-semibold"
                          style={{ 
                            backgroundColor: home.costing_type === 'free' ? '#EDC750' : '#5D6F47',
                            color: home.costing_type === 'free' ? '#000' : '#fff'
                          }}
                        >
                          {home.costing_type.replace('_', ' & ').toUpperCase()}
                        </span>
                      </div>
                    )}
                    {home.monthly_charges_minimum && (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-gray-800">Minimum:</span>
                        <span className="text-sm text-gray-600">₹{home.monthly_charges_minimum}/month</span>
                      </div>
                    )}
                    {home.monthly_charges_maximum && (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-gray-800">Maximum:</span>
                        <span className="text-sm text-gray-600">₹{home.monthly_charges_maximum}/month</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {home.notes && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-bold mb-3 text-gray-800">Additional Information</h3>
                  <p className="text-sm leading-relaxed text-gray-600">{home.notes}</p>
                </div>
              )}
            </div>

            {/* Map Card */}
            {home.latitude && home.longitude && (
              <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold mb-4 text-gray-800">Location Map</h3>
                <MapView
                  homes={[home]}
                  center={[home.latitude, home.longitude]}
                  radius={null}
                />
                {home.map_location && (
                  <a
                    href={home.map_location}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-4 px-6 py-3 rounded-lg font-semibold text-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                    style={{ backgroundColor: '#5D6F47' }}
                  >
                    Open in Google Maps ↗
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Nearby Homes */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm sticky top-24">
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#5D6F47' }}>
                Nearby Homes
              </h3>
              
              {nearbyHomes.length > 0 ? (
                <div className="space-y-3">
                  {nearbyHomes.map((nearby) => (
                    <div
                      key={nearby.id}
                      onClick={() => navigate(`/home/${nearby.id}`)}
                      className="p-4 rounded-lg border border-gray-200 cursor-pointer transition-all hover:shadow-sm hover:-translate-y-1 hover:border-[#5D6F47]"
                    >
                      <h4 className="font-semibold text-sm mb-2 text-gray-800">
                        {nearby.organisation_name}
                      </h4>
                      <p className="text-xs mb-1 text-gray-600">
                        {nearby.district}, {nearby.state}
                      </p>
                      <p className="text-xs font-semibold" style={{ color: '#5D6F47' }}>
                        {nearby.distance_km} km away
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  No nearby homes found within 20km
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailPage;
