import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Ticket, PlusCircle, Building2 } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const user = { name: 'Admin User', role: 'admin' };
  const [imgError, setImgError] = useState(false);

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0 z-30 shadow-sm">
      
      {/* LOGO AREA 
          - Removed 'bg-[#4a5838]' (Green) -> Now White/Transparent
          - Added 'border-b' for a clean separation since the green header is gone
      */}
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
            // REMOVED 'brightness-0 invert': Logo now shows its original colors
            className="h-10 w-auto object-contain" 
            />
        ) : (
            // Fallback Text: Changed to Green to match brand since background is white
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

        <NavLink 
  to="/tickets/new" 
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