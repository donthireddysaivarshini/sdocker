import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { searchService } from '../services/api';

const HomePage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await searchService.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <div style={{ backgroundColor: '#5D6F47' }} className="text-white">
        <div className="max-w-6xl mx-auto px-4 py-24">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Saanidhyam
            </h1>
            
            <p className="text-xl mb-12 text-gray-100">
              Internal Tool for Senior Citizen Services search.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/search"
                className="btn-primary"
              >
                Start Your Search
              </Link>
              <a
                href="#features"
                className="btn-secondary"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      {!loading && stats && (
        <div className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-2" style={{ color: '#2c3e50' }}>
                Trusted Nationwide
              </h2>
              <p style={{ color: '#6c757d' }}>Comprehensive database of verified old age homes</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* --- ADDED BORDER CLASSES HERE --- */}
              <div className="stat-card p-6 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="text-5xl font-bold mb-2" style={{ color: '#5D6F47' }}>
                  {stats.total_homes || 0}
                </div>
                <div className="text-lg font-semibold mb-1" style={{ color: '#2c3e50' }}>
                  Registered Homes
                </div>
                <div className="text-sm" style={{ color: '#6c757d' }}>
                  Verified facilities
                </div>
              </div>
              
              <div className="stat-card p-6 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="text-5xl font-bold mb-2" style={{ color: '#5D6F47' }}>
                  {stats.by_state?.length || 0}
                </div>
                <div className="text-lg font-semibold mb-1" style={{ color: '#2c3e50' }}>
                  States Covered
                </div>
                <div className="text-sm" style={{ color: '#6c757d' }}>
                  Nationwide presence
                </div>
              </div>
              
              <div className="stat-card p-6 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="text-5xl font-bold mb-2" style={{ color: '#5D6F47' }}>
                  {stats.homes_with_location || 0}
                </div>
                <div className="text-lg font-semibold mb-1" style={{ color: '#2c3e50' }}>
                  GPS Located
                </div>
                <div className="text-sm" style={{ color: '#6c757d' }}>
                  Precise location data
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features Section */}
      <div id="features" className="py-20" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-3" style={{ color: '#2c3e50' }}>
              Why Choose Satoru?
            </h2>
            <p className="text-lg" style={{ color: '#6c757d' }}>
              Built for precision and ease of use
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="feature-card">
              <div className="feature-icon">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#2c3e50' }}>
                Location Search
              </h3>
              <p style={{ color: '#6c757d' }}>
                Search by pincode, city, or coordinates with real-time distance calculations using PostGIS.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#2c3e50' }}>
                Verified Data
              </h3>
              <p style={{ color: '#6c757d' }}>
                Accurate contact information, pricing details, and facility specifications.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#2c3e50' }}>
                Smart Filters
              </h3>
              <p style={{ color: '#6c757d' }}>
                Filter by cost, care type, gender, and services to find your perfect match.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ color: '#2c3e50' }}>
            Ready to Find Your Perfect Match?
          </h2>
          <p className="text-lg mb-8" style={{ color: '#6c757d' }}>
            Start your search today and discover quality care facilities.
          </p>
          <Link to="/search" className="btn-primary">
            Begin Your Search
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;