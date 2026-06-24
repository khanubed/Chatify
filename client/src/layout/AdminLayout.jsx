import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Cake,
  Users,
  LayoutDashboard,
  Settings,
  Menu,
  X,
  LogOut,
  ShieldCheck,
} from "lucide-react";

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const navItems = [
    { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/users", label: "User Accounts", icon: Users },
    { path: "/admin/birthdays", label: "Birthday Logs", icon: Cake },
    { path: "/admin/settings", label: "System Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100 flex font-sans">
      {/* --- Sidebar Navigation Panel --- */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#1e293b]/60 backdrop-blur-xl border-r border-slate-800 p-4 flex flex-col justify-between transition-transform duration-300 transform 
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
          md:translate-x-0 md:static md:h-screen`}
      >
        <div className="flex flex-col gap-8">
          {/* Brand Header Identity */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Admin Core
                </h2>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  Control Desk
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Navigation Routes List */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer group border
                    ${
                      isActive
                        ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30 shadow-md"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-transparent"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`size-5 transition-transform group-hover:scale-105 ${isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-300"}`}
                      />
                      {item.label}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Action */}
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
        >
          <LogOut className="size-5" />
          Exit Session
        </button>
      </aside>

      {/* --- Main Dashboard Content Wrapper --- */}
      <div className="flex-1 flex flex-col min-w-0 max-h-screen overflow-hidden">
        {/* Top Navbar Header */}
        <header className="h-16 border-b border-slate-800 bg-[#1e293b]/20 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden text-slate-300 hover:text-white p-1.5 hover:bg-slate-800/60 rounded-lg cursor-pointer"
            >
              <Menu className="size-6" />
            </button>
            <div className="hidden sm:block text-xs bg-slate-800/60 text-slate-400 border border-slate-700/60 px-3 py-1 rounded-full font-medium">
              Environment:{" "}
              <span className="text-emerald-400 font-semibold">
                Production-Live
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
            <div className="text-right leading-3 hidden sm:block">
              <p className="text-sm font-semibold text-white">System Admin</p>
              <span className="text-[10px] text-slate-400">Root Access</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs border border-blue-400/20 shadow-lg shadow-blue-500/10">
              AD
            </div>
          </div>
        </header>

        {/* 🌟 MOUNT SUB-ROUTES HERE DYNAMICALLY */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
        />
      )}
    </div>
  );
};

export default AdminLayout;
