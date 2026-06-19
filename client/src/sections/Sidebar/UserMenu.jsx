import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import assets from "../../assets/assets";

const UserMenu = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div className="relative py-2 group">
      <img
        src={assets.menu_icon}
        alt="Menu"
        className="max-h-5 cursor-pointer"
      />
      <div className="absolute top-full right-0 z-20 w-32 rounded-md bg-[#212b42] p-5 border border-gray-600 text-gray-100 hidden group-hover:block">
        <p
          onClick={() => navigate("/profile")}
          className="cursor-pointer text-sm hover:text-blue-400"
        >
          Edit Profile
        </p>
        <hr className="my-2 border-t border-gray-500" />
        <p
          className="cursor-pointer text-sm hover:text-red-400"
          onClick={logout}
        >
          Logout
        </p>
      </div>
    </div>
  );
};

export default UserMenu;