import React, { useState, useEffect } from 'react';
import { searchService } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { djangoService } from '../ticketing/services/djangoService';
import {
  CheckCircle, XCircle, Loader2, X, ChevronLeft, ChevronRight,
  ShoppingCart, Trash2, ChevronDown, ChevronUp, FileDown, Home
} from 'lucide-react';

// ─── Filter Toggle Switch ─────────────────────────────────────────────────────
const FilterToggle = ({ label, enabled, onToggle, children }) => (
  <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${
    enabled ? 'border-[#5D6F47] bg-[#f6f8f3]' : 'border-gray-200 bg-white'
  }`}>
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2.5 cursor-pointer select-none"
    >
      <span className={`text-sm font-semibold ${enabled ? 'text-[#5D6F47]' : 'text-gray-500'}`}>
        {label}
      </span>
      {/* Toggle pill */}
      <span
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out ${
          enabled ? 'bg-[#5D6F47]' : 'bg-gray-300'
        }`}
        aria-checked={enabled}
        role="switch"
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out mt-0.5 ${
            enabled ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
    {enabled && (
      <div className="px-3 pb-3">
        {children}
      </div>
    )}
  </div>
);

// ─── Floating Selection Cart ──────────────────────────────────────────────────
const SelectionCart = ({ selectedHomes, allResults, onRemove, onClearAll, onExport, isExported }) => {
  const [collapsed, setCollapsed] = useState(false);
  const count = selectedHomes.size;

  if (count === 0) return null;

  const selectedList = allResults.filter(h => selectedHomes.has(h.id));

  return (
    <div
      className="fixed right-4 top-24 z-50 w-72 rounded-2xl shadow-2xl border border-[#5D6F47]/20 bg-white flex flex-col overflow-hidden"
      style={{ maxHeight: 'calc(100vh - 120px)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        style={{ backgroundColor: '#5D6F47' }}
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-white" />
          <span className="text-white font-bold text-sm">Selected Homes</span>
          <span className="bg-[#EDC750] text-black text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
            {count}
          </span>
        </div>
        {collapsed
          ? <ChevronDown className="w-4 h-4 text-white/80" />
          : <ChevronUp className="w-4 h-4 text-white/80" />
        }
      </div>

      {!collapsed && (
        <>
          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100" style={{ maxHeight: '340px' }}>
            {selectedList.map(home => (
              <div key={home.id} className="flex items-start gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors group">
                <Home className="w-3.5 h-3.5 text-[#5D6F47] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 leading-tight truncate">
                    {home.organisation_name}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                    {home.district}, {home.state}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(home.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-red-400 hover:text-red-600 p-0.5 rounded"
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Footer actions */}
          <div className="border-t border-gray-100 p-3 space-y-2 bg-gray-50">
            <button
              onClick={onExport}
              disabled={isExported}
              className={`w-full py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5 transition-all ${
                isExported
                  ? 'bg-green-600 text-white cursor-default'
                  : 'text-white hover:opacity-90'
              }`}
              style={isExported ? {} : { backgroundColor: '#5D6F47' }}
            >
              {isExported ? (
                <><CheckCircle className="w-4 h-4" /> Exported!</>
              ) : (
                <><FileDown className="w-4 h-4" /> Export PDF ({count})</>
              )}
            </button>
            <button
              onClick={onClearAll}
              className="w-full py-1.5 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-100 flex items-center justify-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Main Search Page ─────────────────────────────────────────────────────────
const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const navigate = useNavigate();
  const [selectedHomes, setSelectedHomes] = useState(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExported, setIsExported] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const [filters, setFilters] = useState({
    state: searchParams.get('state') || '',
    district: searchParams.get('district') || '',
    costing: searchParams.get('costing') || '',
    gender: searchParams.get('gender') || '',
    care_type: searchParams.get('care_type') || '',
    pincode: searchParams.get('pincode') || '',
    radius: searchParams.get('radius') || '10',
    services_type: searchParams.get('services_type') || '',
  });

  // Track which filters are toggled ON
  const [filterEnabled, setFilterEnabled] = useState({
    pincode: !!searchParams.get('pincode'),
    costing: !!searchParams.get('costing'),
    gender: !!searchParams.get('gender'),
    care_type: !!searchParams.get('care_type'),
    services_type: !!searchParams.get('services_type'),
  });

  const debouncedSearchQuery = useDebounce(searchQuery, 150);

  useEffect(() => {
    if (searchParams.toString()) {
      handleSearch(true);
    }
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedSearchQuery.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const data = await searchService.autocomplete(debouncedSearchQuery);
        setSuggestions(data.suggestions || []);
      } catch (error) {
        console.error('Autocomplete error:', error);
      }
    };
    fetchSuggestions();
  }, [debouncedSearchQuery]);

  // Toggle a filter on/off; when turned off, clear its value
  const toggleFilter = (key) => {
    const nowEnabled = !filterEnabled[key];
    setFilterEnabled(prev => ({ ...prev, [key]: nowEnabled }));
    if (!nowEnabled) {
      // Reset value when toggled off
      const reset = key === 'radius' ? '10' : '';
      setFilters(prev => ({ ...prev, [key]: reset }));
    }
  };

  const getActiveFilters = () => {
    const active = {};
    Object.entries(filters).forEach(([key, val]) => {
      // pincode and radius are linked
      if (key === 'pincode') active[key] = filterEnabled.pincode ? val : '';
      else if (key === 'radius') active[key] = filterEnabled.pincode ? val : '10';
      else active[key] = filterEnabled[key] ? val : '';
    });
    return active;
  };

  const handleSearch = async (skipUrlUpdate = false, overrideQuery = null, overrideFilters = null) => {
    setLoading(true);
    setShowSuggestions(false);
    setSearchPerformed(true);
    setCurrentPage(1);

    const activeQuery = overrideQuery !== null ? overrideQuery : searchQuery;
    const activeFilters = overrideFilters !== null ? overrideFilters : getActiveFilters();
    const safeRadius = parseInt(activeFilters.radius) || 10;

    if (!skipUrlUpdate) {
      const params = { q: activeQuery, ...activeFilters, radius: safeRadius.toString() };
      Object.keys(params).forEach(key => !params[key] && delete params[key]);
      setSearchParams(params);
    }

    try {
      let data;
      if (activeFilters.pincode) {
        const nearbyParams = {
          q: activeQuery,
          pincode: activeFilters.pincode,
          radius: safeRadius,
        };
        if (activeFilters.services_type) nearbyParams.services_type = activeFilters.services_type;
        if (activeFilters.costing) nearbyParams.costing = activeFilters.costing;
        if (activeFilters.gender) nearbyParams.gender = activeFilters.gender;
        if (activeFilters.care_type) nearbyParams.care_type = activeFilters.care_type;
        data = await searchService.nearby(nearbyParams);
        setResults(Array.isArray(data.results) ? data.results : []);
      } else {
        data = await searchService.search({ q: activeQuery, ...activeFilters });
        setResults(data.results ? data.results : (Array.isArray(data) ? data : []));
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    let newQuery = searchQuery;
    let newFilters = { ...getActiveFilters() };

    if (suggestion.type === 'facility') {
      newQuery = suggestion.name;
      setSearchQuery(suggestion.name);
    } else if (suggestion.type === 'pincode') {
      const cleanPincode = suggestion.name.replace('Pincode ', '');
      newFilters = { ...newFilters, pincode: cleanPincode };
      setFilters(prev => ({ ...prev, pincode: cleanPincode }));
      setFilterEnabled(prev => ({ ...prev, pincode: true }));
    } else {
      newQuery = suggestion.name;
      setSearchQuery(suggestion.name);
    }
    setShowSuggestions(false);
    handleSearch(false, newQuery, newFilters);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const toggleHomeSelection = (homeId) => {
    setSelectedHomes(prev => {
      const next = new Set(prev);
      if (next.has(homeId)) next.delete(homeId);
      else next.add(homeId);
      return next;
    });
  };

  const removeFromSelection = (homeId) => {
    setSelectedHomes(prev => {
      const next = new Set(prev);
      next.delete(homeId);
      return next;
    });
  };

  const hasActiveFilters = Object.values(filterEnabled).some(Boolean);

  const clearAllFilters = () => {
    const cleanFilters = {
      state: '', district: '', costing: '', gender: '',
      care_type: '', pincode: '', radius: '10', services_type: ''
    };
    const cleanEnabled = {
      pincode: false, costing: false, gender: false,
      care_type: false, services_type: false,
    };
    setFilters(cleanFilters);
    setFilterEnabled(cleanEnabled);
    setSearchParams({ q: searchQuery });
    handleSearch(false, searchQuery, cleanFilters);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentResults = results.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(results.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Search Header ── */}
      <div className="bg-white py-12" style={{ backgroundColor: '#5D6F47' }}>
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-8 text-center text-white">Search Old Age Homes</h1>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onKeyPress={handleKeyPress}
                placeholder="Search by name, city, district, or pincode..."
                className="w-full px-4 py-3 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-sm"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{suggestion.name}</div>
                          <div className="text-sm mt-1 text-gray-600">{suggestion.location}</div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          suggestion.type === 'facility' ? 'bg-green-600 text-white' :
                          suggestion.type === 'location' ? 'bg-yellow-400 text-black' :
                          'bg-blue-500 text-white'
                        }`}>
                          {suggestion.type}
                          {suggestion.count && ` (${suggestion.count})`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="px-6 py-3 rounded-lg font-bold text-black transition-all shadow-sm hover:shadow-md disabled:opacity-50"
              style={{ backgroundColor: '#EDC750' }}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-800">Filters</h3>
              {hasActiveFilters && (
                <span className="text-[10px] font-bold bg-[#5D6F47] text-white px-1.5 py-0.5 rounded-full">
                  {Object.values(filterEnabled).filter(Boolean).length} ON
                </span>
              )}
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-sm font-medium"
                style={{ color: '#5D6F47' }}
              >
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

            {/* Pincode filter */}
            <FilterToggle
              label="Pincode / Nearby"
              enabled={filterEnabled.pincode}
              onToggle={() => toggleFilter('pincode')}
            >
              <input
                type="text"
                value={filters.pincode}
                onChange={(e) => setFilters(prev => ({ ...prev, pincode: e.target.value }))}
                placeholder="e.g. 500008"
                maxLength="6"
                className="w-full px-3 py-1.5 mt-1 border border-[#5D6F47]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5D6F47] text-sm bg-white"
              />
              <div className="mt-2">
                <label className="text-xs text-gray-500 font-medium">Radius (km)</label>
                <input
                  type="number"
                  min="1"
                  value={filters.radius}
                  onChange={(e) => setFilters(prev => ({ ...prev, radius: e.target.value }))}
                  placeholder="10"
                  className="w-full px-3 py-1.5 mt-1 border border-[#5D6F47]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5D6F47] text-sm bg-white"
                />
              </div>
            </FilterToggle>

            {/* Costing filter */}
            <FilterToggle
              label="Costing"
              enabled={filterEnabled.costing}
              onToggle={() => toggleFilter('costing')}
            >
              <select
                value={filters.costing}
                onChange={(e) => setFilters(prev => ({ ...prev, costing: e.target.value }))}
                className="w-full px-3 py-1.5 mt-1 border border-[#5D6F47]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5D6F47] text-sm bg-white"
              >
                <option value="">All</option>
                <option value="free">Free</option>
                <option value="pay">Pay</option>
                <option value="pay_stay">Pay &amp; Stay</option>
              </select>
            </FilterToggle>

            {/* Gender filter */}
            <FilterToggle
              label="Gender"
              enabled={filterEnabled.gender}
              onToggle={() => toggleFilter('gender')}
            >
              <select
                value={filters.gender}
                onChange={(e) => setFilters(prev => ({ ...prev, gender: e.target.value }))}
                className="w-full px-3 py-1.5 mt-1 border border-[#5D6F47]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5D6F47] text-sm bg-white"
              >
                <option value="">All</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="both">Both</option>
              </select>
            </FilterToggle>

            {/* Care Type filter */}
            <FilterToggle
              label="Care Type"
              enabled={filterEnabled.care_type}
              onToggle={() => toggleFilter('care_type')}
            >
              <select
                value={filters.care_type}
                onChange={(e) => setFilters(prev => ({ ...prev, care_type: e.target.value }))}
                className="w-full px-3 py-1.5 mt-1 border border-[#5D6F47]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5D6F47] text-sm bg-white"
              >
                <option value="">All</option>
                <option value="basic">Basic</option>
                <option value="nursing">Nursing</option>
                <option value="day">Day Care</option>
                <option value="residential">Residential</option>
              </select>
            </FilterToggle>

            {/* Service Type filter */}
            <FilterToggle
              label="Service Type"
              enabled={filterEnabled.services_type}
              onToggle={() => toggleFilter('services_type')}
            >
              <select
                value={filters.services_type}
                onChange={(e) => setFilters(prev => ({ ...prev, services_type: e.target.value }))}
                className="w-full px-3 py-1.5 mt-1 border border-[#5D6F47]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5D6F47] text-sm bg-white"
              >
                <option value="">All</option>
                <option value="Aasara Day Care Centers">Aasara Day Care Centers</option>
                <option value="Day Care Centers">Day Care Centers</option>
                <option value="Palliative Care">Palliative Care</option>
                <option value="Elder Care / Home Care">Elder Care / Home Care</option>
                <option value="Old Age Home">Old Age Home</option>
              </select>
            </FilterToggle>

          </div>

          {/* Apply filters button — only show when at least one is toggled */}
          {hasActiveFilters && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => handleSearch()}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#5D6F47' }}
              >
                Apply Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Results ── */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {searchPerformed && results.length > 0 && (
          <div className="mb-6 flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-800">
              Found <span style={{ color: '#5D6F47' }}>{results.length}</span> homes
              {selectedHomes.size > 0 && (
                <span className="ml-4 text-sm font-normal text-gray-600">
                  · {selectedHomes.size} selected
                </span>
              )}
            </span>
          </div>
        )}

        {results.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentResults.map((home) => {
                const isSelected = selectedHomes.has(home.id);
                return (
                  <div
                    key={home.id}
                    className={`bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-all relative ${
                      isSelected ? 'border-[#5D6F47] ring-2 ring-[#5D6F47]/20' : 'border-gray-200'
                    }`}
                  >
                    <div className="absolute top-4 right-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleHomeSelection(home.id)}
                        className="w-5 h-5 cursor-pointer rounded accent-[#5D6F47]"
                      />
                    </div>

                    <h3 className="text-lg font-bold mb-3 text-gray-800 pr-8">
                      {home.organisation_name}
                    </h3>

                    <div className="space-y-2 text-sm mb-4">
                      <p className="text-gray-600">
                        <span className="font-semibold">Location:</span>{' '}
                        {home.city_town_mandal && `${home.city_town_mandal}, `}
                        {home.district}, {home.state}
                      </p>
                      {home.distance_km && (
                        <div className="inline-block px-3 py-1 rounded font-semibold text-sm" style={{ backgroundColor: '#EDC750' }}>
                          {home.distance_km.toFixed(2)} km away
                        </div>
                      )}
                      {home.costing_type && (
                        <p className="text-gray-600">
                          <span className="font-semibold">Cost:</span>{' '}
                          <span className="capitalize">{home.costing_type.replace('_', ' & ')}</span>
                        </p>
                      )}
                      {home.contact_number && home.contact_number.length > 0 && (
                        <p className="text-gray-600">
                          <span className="font-semibold">Phone:</span>{' '}
                          {home.contact_number.slice(0, 2).join(', ')}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => navigate(`/home/${home.id}`)}
                      className="w-full py-2 rounded-lg font-semibold text-white transition-all text-sm"
                      style={{ backgroundColor: '#5D6F47' }}
                    >
                      View Details
                    </button>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-10 gap-6">
                <button
                  onClick={() => { setCurrentPage(p => Math.max(p - 1, 1)); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg font-semibold border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-700"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="text-gray-600 font-medium">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => { setCurrentPage(p => Math.min(p + 1, totalPages)); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg font-semibold border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-700"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : searchPerformed && !loading && (
          <div className="text-center py-20">
            <p className="text-xl mb-6 text-gray-600">No results found</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilters({ state: '', district: '', costing: '', gender: '', care_type: '', pincode: '', radius: '10', services_type: '' });
                setFilterEnabled({ pincode: false, costing: false, gender: false, care_type: false, services_type: false });
                setResults([]);
                setSearchPerformed(false);
                setSearchParams({});
              }}
              className="px-6 py-3 rounded-lg font-semibold text-white shadow-sm hover:shadow-md transition-all"
              style={{ backgroundColor: '#5D6F47' }}
            >
              Reset Search
            </button>
          </div>
        )}
      </div>

      {/* ── Floating Selection Cart ── */}
      <SelectionCart
        selectedHomes={selectedHomes}
        allResults={results}
        onRemove={removeFromSelection}
        onClearAll={() => setSelectedHomes(new Set())}
        onExport={() => setShowExportModal(true)}
        isExported={isExported}
      />

      {/* ── Export Modal ── */}
      {showExportModal && (
        <ExportModal
          homes={results.filter(h => selectedHomes.has(h.id))}
          onClose={() => setShowExportModal(false)}
          onSuccess={() => {
            setShowExportModal(false);
            setIsExported(true);
            setTimeout(() => {
              setIsExported(false);
              setSelectedHomes(new Set());
            }, 2500);
          }}
        />
      )}
    </div>
  );
};

// ─── Export Modal (unchanged logic, same styling) ─────────────────────────────
const ExportModal = ({ homes, onClose, onSuccess }) => {
  const [selectedFields, setSelectedFields] = useState({
    name: true, location: true, address: true, contact: true,
    email: true, website: true, services: true, pricing: true, notes: true,
  });
  const [ticketId, setTicketId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [availableTickets, setAvailableTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await djangoService.getTickets(1);
        let tickets = [];
        if (response && Array.isArray(response.results)) tickets = response.results;
        else if (Array.isArray(response)) tickets = response;
        const excluded = ['SENT_TO_CLIENT', 'FOLLOW_UP', 'CLOSED'];
        setAvailableTickets(tickets.filter(t => !excluded.includes(t.status)));
      } catch (e) {
        console.error('Error fetching tickets', e);
      } finally {
        setLoadingTickets(false);
      }
    };
    fetchTickets();
  }, []);

  const toggleField = (field) => setSelectedFields(prev => ({ ...prev, [field]: !prev[field] }));

  const handleExport = async () => {
    if (!ticketId) { setError('Please select a Ticket ID.'); return; }
    setExporting(true);
    setError(null);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('You are not logged in.');
      const cleanBaseUrl = apiBaseUrl.replace(/\/$/, '');
      const response = await fetch(`${cleanBaseUrl}/api/export/pdf/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ homes, fields: selectedFields, ticketId }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(errorData.error || `Export failed (${response.status})`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `satoru-homes-ticket-${ticketId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      if (onSuccess) onSuccess(); else onClose();
    } catch (err) {
      console.error('Export error:', err);
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-lg border border-gray-100">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Export Settings</h2>
        <p className="text-sm text-gray-600 mb-4">Select which information to include ({homes.length} homes)</p>
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Select Ticket <span className="text-red-500">*</span>
          </label>
          <select
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loadingTickets}
          >
            <option value="">-- Select a Ticket --</option>
            {availableTickets.map(ticket => (
              <option key={ticket.id} value={ticket.id}>
                {ticket.id} - {ticket.clientName} ({ticket.status.replace(/_/g, ' ')})
              </option>
            ))}
          </select>
          {loadingTickets && <p className="text-xs text-gray-500 mt-1">Loading tickets...</p>}
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
          {[
            { key: 'name', label: 'Organization Name' },
            { key: 'location', label: 'Location' },
            { key: 'address', label: 'Full Address' },
            { key: 'contact', label: 'Contact Numbers' },
            { key: 'email', label: 'Email' },
            { key: 'website', label: 'Website' },
            { key: 'services', label: 'Services' },
            { key: 'pricing', label: 'Pricing' },
            { key: 'notes', label: 'Notes' },
          ].map(field => (
            <label key={field.key} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={selectedFields[field.key]} onChange={() => toggleField(field.key)} />
              <span>{field.label}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border px-4 py-2 rounded-lg">Cancel</button>
          <button
            onClick={handleExport}
            disabled={exporting || !ticketId}
            className={`flex-1 px-4 py-2 rounded-lg text-white flex justify-center gap-2 ${
              ticketId ? 'bg-green-700' : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {exporting && <Loader2 className="w-4 h-4 animate-spin" />}
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;