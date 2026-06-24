import React, { useContext } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
// import ProfilePage from "./pages/ProfilePage";
import AdminLayout from "./layout/AdminLayout";
import AdminBirthdayPage from "./pages/admin/AdminBirthdayPage";
import { Toaster } from "react-hot-toast";
import { AuthContext } from "./context/AuthContext";
import ProfilePage from "./pages/ProfilePage";

// 🌟 Quick temporary placeholders for other admin views (Replace with real pages later)
const AdminDashboard = () => (
  <div className="p-8 text-white">
    <h2 className="text-2xl font-bold">Metrics Dashboard Overview</h2>
  </div>
);
const AdminUsers = () => (
  <div className="p-8 text-white">
    <h2 className="text-2xl font-bold">User Accounts Directory Table</h2>
  </div>
);
const AdminSettings = () => (
  <div className="p-8 text-white">
    <h2 className="text-2xl font-bold">Engine Variables Console</h2>
  </div>
);

const App = () => {
  const { authUser } = useContext(AuthContext);

  return (
    <div className="w-full h-screen bg-cover bg-center bg-[url('/bgImage.webp')]">
      <Toaster />
      <Routes>
        {/* --- Public / Protected Client Side Routes --- */}
        <Route
          path="/"
          element={!authUser ? <Navigate to="/login" /> : <HomePage />}
        />
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/" />}
        />
        <Route
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
        />

        {/* --- 🌟 Protected Admin Console Architecture --- */}
        <Route
          path="/admin"
          // element={
          //   authUser && authUser.isAdmin ? (
          //     <AdminLayout />
          //   ) : (
          //     <Navigate to="/" replace />
          //   )
          // }
          element = { <AdminLayout /> }
        >
          {/* Automatically redirect generic "/admin" visits directly to dashboard metrics */}
          <Route index element={<Navigate to="dashboard" replace />} />

          {/* <Outlet /> */}
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="birthdays" element={<AdminBirthdayPage />} />
          {/* <Route path="settings" element={<AdminSettings />} /> */}
        </Route>

        {/* Global Fallback Route redirection handle */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
