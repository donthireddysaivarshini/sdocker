import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Ticket, PlusCircle, Building2, ArrowLeft } from 'lucide-react';

// --- INTERNAL SIDEBAR COMPONENT ---
const Sidebar: React.FC = () => {
  const user = { name: 'Admin User', role: 'admin' };
  const [imgError, setImgError] = useState(false);

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0 z-30 shadow-sm">

      {/* LOGO AREA */}
      <div className="h-16 w-full flex justify-center items-center bg-white border-b border-slate-100 shadow-sm shrink-0">
        {!imgError ? (
          <img
            src="/logo.webp"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src.endsWith('.webp')) {
                target.src = "/logo.png";
              } else {
                setImgError(true);
              }
            }}
            alt="Satoru Foundation"
            className="h-10 w-auto object-contain"
          />
        ) : (
          <div className="text-[#4a5838] font-bold text-lg flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            <span>SATORU</span>
          </div>
        )}
      </div>

      <div className="flex-1 px-4 space-y-1 overflow-y-auto mt-6">
        <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Menu</p>

        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) =>
            `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-[#4a5838] text-white shadow-lg shadow-[#4a5838]/20'
                : 'text-slate-500 hover:bg-slate-50 hover:text-[#4a5838]'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mr-3" />
          Dashboard
        </NavLink>

        <NavLink
          to="/tickets"
          end
          className={({ isActive }) =>
            `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-[#4a5838] text-white shadow-lg shadow-[#4a5838]/20'
                : 'text-slate-500 hover:bg-slate-50 hover:text-[#4a5838]'
            }`
          }
        >
          <Ticket className="w-5 h-5 mr-3" />
          All Tickets
        </NavLink>

        {/* ── NEW: Create Ticket link ───────────────────────────────────── */}
        <NavLink
          to="/tickets/new"
          end
          className={({ isActive }) =>
            `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-[#4a5838] text-white shadow-lg shadow-[#4a5838]/20'
                : 'text-slate-500 hover:bg-slate-50 hover:text-[#4a5838]'
            }`
          }
        >
          <PlusCircle className="w-5 h-5 mr-3" />
          Create Ticket
        </NavLink>
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 rounded-full bg-[#4a5838] flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate capitalize">{user.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

// --- LAYOUT COMPONENT ---
export const Layout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-[#4a5838] sticky top-0 z-20 px-8 flex items-center shadow-md relative">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <h2 className="text-xl font-bold text-white tracking-wide">
              Ticketing System
            </h2>
          </div>
          <div className="ml-auto">
            <a
              href="/"
              className="group flex items-center gap-2 px-5 py-2 bg-black hover:bg-slate-800 text-white rounded-lg transition-all duration-300 font-medium text-sm shadow-lg shadow-black/20"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Search Engine
            </a>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};