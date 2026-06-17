import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react'; 

// --- AUTH ---
import { AuthProvider, useAuth } from './ticketing/AuthContext';

// --- YOUR TICKETING PAGES ---
import { Dashboard } from './ticketing/pages/Dashboard';
import { TicketList } from './ticketing/pages/TicketList';
import { CreateTicket } from './ticketing/pages/CreateTicket';
import { TicketDetail } from './ticketing/pages/TicketDetail';
import { Sidebar } from './ticketing/components/Sidebar';
import { Login } from './ticketing/pages/Login';

// --- SEARCH ENGINE PAGES ---
import HomePage from './components/HomePage';
import SearchPage from './components/SearchPage';
import FileUpload from './components/FileUpload';
import DetailPage from './components/DetailPage';

// --- 1. AUTH GUARD ---
const RequireAuth = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex h-screen items-center justify-center text-[#5D6F47] font-bold">Loading...</div>;
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// --- 2. LAYOUTS ---

// Layout A: Search Engine (Top Navbar with Logout)
const SearchLayout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); 
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <nav className="bg-white shadow-md sticky top-0 z-50 border-b border-[#e0e0e0]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <img src="/logo.webp" alt="Satoru Logo" className="h-12 w-auto object-contain" />
            </Link>
            
            {/* Nav Links */}
            <div className="flex items-center space-x-2">
              <Link to="/" className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:text-[#5D6F47] hover:bg-gray-50">Home</Link>
              <Link to="/search" className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:text-[#5D6F47] hover:bg-gray-50">Search</Link>
              <Link to="/upload" className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:text-[#5D6F47] hover:bg-gray-50">Upload</Link>
              
              {/* Link to CRM */}
              <Link to="/dashboard" className="ml-2 px-4 py-2 rounded-lg font-bold text-[#5D6F47] border border-[#5D6F47] hover:bg-[#5D6F47] hover:text-white transition-all">
                  Staff Portal
              </Link>

              {/* LOGOUT BUTTON (Updated Structure) */}
              <button 
                onClick={handleLogout}
                className="ml-2 flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white bg-[#5D6F47] hover:bg-[#4a5838] shadow-md transition-all"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <Outlet />
    </div>
  );
};

// Layout B: Ticketing System (Sidebar)
const TicketingLayout = () => (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-900">
      <Sidebar /> 
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen overflow-y-auto p-4 md:p-8">
        <div className="mb-4 flex justify-end">
            <Link to="/" className="text-sm font-medium text-[#5D6F47] hover:underline">
                &larr; Back to Search Engine
            </Link>
        </div>
        <Outlet />
      </div>
    </div>
);

// --- 3. MAIN APP ---
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
            {/* PUBLIC ROUTE */}
            <Route path="/login" element={<Login />} />

            {/* PROTECTED ROUTES */}
            <Route element={<RequireAuth />}>
                
                {/* Search Engine Group */}
                <Route element={<SearchLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/home/:id" element={<DetailPage />} />
                    <Route path="/upload" element={<FileUpload />} />
                </Route>

                {/* Ticketing System Group */}
                <Route element={<TicketingLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/tickets" element={<TicketList />} />
                     <Route path="/tickets/new"    element={<CreateTicket />} /> 
                    <Route path="/tickets/:id" element={<TicketDetail />} />
                </Route>

            </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;