import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import assets from "../assets/assets";
import { AuthContext } from "../context/AuthContext";

const ProfilePage = () => {
  const { authUser, editProfile } = useContext(AuthContext);
  const navigate = useNavigate();

  // 🌟 Format the MongoDB date string into YYYY-MM-DD for the HTML input
  const defaultDob = authUser?.dob
    ? new Date(authUser.dob).toISOString().split("T")[0]
    : "";

  const [selectedImg, setSelectedImg] = useState(null);
  const [name, setName] = useState(authUser?.fullName || "");
  const [bio, setBio] = useState(authUser?.bio || "");
  const [dob, setDob] = useState(defaultDob); // 🌟 ADDED DOB STATE

  const submitHandler = async (e) => {
    e.preventDefault();

    // 🌟 ADDED DOB TO PAYLOADS
    if (!selectedImg) {
      await editProfile({ fullName: name, bio, dob });
    } else {
      const picReader = new FileReader();
      picReader.readAsDataURL(selectedImg);
      picReader.onload = async () => {
        const base64Image = picReader.result;
        await editProfile({
          profilePic: base64Image,
          fullName: name,
          bio,
          dob,
        });
      };
    }

    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-no-repeat">
      <div className="w-5/6 max-w-2xl backdrop-blur-2xl text-gray-300 border-gray-600 flex items-center justify-between max-sm:flex-col-reverse rounded-lg">
        <form
          onSubmit={submitHandler}
          className="flex flex-col p-10 gap-5 flex-1"
        >
          <h3 className="text-lg">Profile Details</h3>

          <label
            htmlFor="avatar"
            className="flex items-center gap-3 cursor-pointer "
          >
            <input
              onChange={(e) => setSelectedImg(e.target.files[0])}
              type="file"
              id="avatar"
              accept=".png, .jpg, .jpeg"
              hidden
            />
            <img
              src={
                selectedImg
                  ? URL.createObjectURL(selectedImg)
                  : authUser?.profilePic || assets.avatar_icon
              }
              alt=""
              className={`w-12 h-12 ${selectedImg ? "rounded-full" : authUser?.profilePic ? "rounded-full" : ""}`}
            />
            upload profile image
          </label>

          <input
            onChange={(e) => setName(e.target.value)}
            value={name}
            type="text"
            required
            placeholder="Your name"
            className="p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700 bg-transparent"
          />

          {/* 🌟 ADDED DOB INPUT */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400">Date of Birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="p-2 rounded-md border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-700 bg-transparent text-gray-300"
              required
            />
          </div>

          <textarea
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write the profile bio"
            value={bio}
            className="p-2 rounded-md border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-700 bg-transparent"
            required
            rows={4}
          ></textarea>

          <button
            className="bg-gradient-to-r from-blue-400 to-gray-600 text-white p-2 rounded-full text-lg cursor-pointer"
            type="submit"
          >
            Save
          </button>
        </form>

        <img
          src={authUser?.profilePic || assets.logo_icon}
          className={`max-w-44 h-auto mx-10 max-sm:mt-10 ${authUser?.profilePic ? "rounded-full" : "rounded"}`}
          alt=""
        />
      </div>
    </div>
  );
};

export default ProfilePage;
