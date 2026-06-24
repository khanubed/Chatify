import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Cake,
  Plus,
  Trash2,
  Edit2,
  X,
  Calendar,
  User,
  Sparkles,
} from "lucide-react";
import assets from "../../assets/assets";
import API from "../../api/axios";

const AdminBirthdayPage = () => {
  const [birthdays, setBirthdays] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal Control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    userId: "",
    dob: "",
    isCelebrated: true,
    image: "",
    message: "",
    heading: "",
    subHeading: "",
  });
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    fetchBirthdays();
    fetchUsers();
  }, []);

  const fetchBirthdays = async () => {
    try {
      const { data } = await axios.get("/api/birthday/all");
      if (data.success) setBirthdays(data.birthdays);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load birthdays");
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await API.get("/messages/users");
      if (data.success) setUsers(data.users);
    } catch (error) {
      console.error("Could not populate user select menu", error);
    }
  };

  // 🌟 HELPER: Check if a ISO DOB string matches today's Month and Day
  const isBirthdayToday = (dobString) => {
    if (!dobString) return false;
    const today = new Date();
    const birthDate = new Date(dobString);
    return (
      today.getDate() === birthDate.getDate() &&
      today.getMonth() === birthDate.getMonth()
    );
  };

  // 🌟 FILTERED LIST: Find all users whose birthday lands on today's calendar date
  const todaysBirthdayUsers = users.filter((u) => isBirthdayToday(u.dob));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImagePreview(URL.createObjectURL(file));

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, image: reader.result }));
    };
  };

  const handleOpenCreate = (userPreset = null) => {
    setEditingId(null);
    setImagePreview("");

    // 🌟 If an admin clicks on a quick-create banner prompt, pre-populate their profile values
    setFormData({
      userId: userPreset ? userPreset._id : "",
      dob: userPreset?.dob
        ? new Date(userPreset.dob).toISOString().split("T")[0]
        : "",
      isCelebrated: true,
      image: "",
      message: userPreset
        ? `Wishing a fantastic birthday to our amazing community member, ${userPreset.fullName}! 🎉`
        : "",
      heading: userPreset
        ? `Happy Birthday, ${userPreset.fullName}! 🎂`
        : "Happy Birthday!",
      subHeading: "Cheers to another great year ahead!",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record) => {
    setEditingId(record._id);
    setImagePreview(record.image || "");
    setFormData({
      userId: record.userId?._id || record.userId || "",
      dob: record.dob ? new Date(record.dob).toISOString().split("T")[0] : "",
      isCelebrated: record.isCelebrated,
      image: record.image || "",
      message: record.message || "",
      heading: record.heading || "",
      subHeading: record.subHeading || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        const { data } = await axios.put(
          `/api/birthday/update/${editingId}`,
          formData,
        );
        if (data.success) {
          toast.success("Birthday template updated");
          fetchBirthdays();
          setIsModalOpen(false);
        }
      } else {
        const { data } = await axios.post("/api/birthday/create", formData);
        if (data.success) {
          toast.success("Birthday template created");
          fetchBirthdays();
          setIsModalOpen(false);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this celebration template?",
      )
    )
      return;
    try {
      const { data } = await axios.delete(`/api/birthday/delete/${id}`);
      if (data.success) {
        toast.success("Template removed successfully");
        setBirthdays((prev) => prev.filter((item) => item._id !== id));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete record");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100 p-4 sm:p-8">
      {/* --- Main Dashboard Header Panel --- */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Cake className="text-pink-500 animate-bounce size-8" />
            Birthday Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure system anniversary templates, customized push banners, and
            celebration cards.
          </p>
        </div>
        <button
          onClick={() => handleOpenCreate()}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 text-white font-medium px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-blue-500/10 cursor-pointer text-sm"
        >
          <Plus className="size-5" /> Create Template
        </button>
      </div>

      {/* --- 🌟 LIVE RECOGNITION NOTIFICATION WRAPPER --- */}
      {todaysBirthdayUsers.length > 0 && (
        <div className="max-w-6xl mx-auto mb-8 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-500/30 rounded-xl p-4 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-pink-500/5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-pink-500/20 text-pink-400 rounded-lg shrink-0 border border-pink-500/30">
              <Sparkles className="size-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Birthdays Identified Today!
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                The database indicates{" "}
                <span className="text-pink-400 font-semibold">
                  {todaysBirthdayUsers.length} user(s)
                </span>{" "}
                are celebrating today. Deploy a layout template card immediately
                to feature them.
              </p>
            </div>
          </div>

          {/* Quick Setup Badges */}
          <div className="flex flex-wrap gap-2">
            {todaysBirthdayUsers.map((user) => (
              <button
                key={user._id}
                onClick={() => handleOpenCreate(user)}
                className="flex items-center gap-2 bg-slate-900/80 hover:bg-slate-950 text-xs text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700/80 hover:border-pink-500/50 transition-all cursor-pointer font-medium"
              >
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                Setup {user.fullName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- Records Visual Grid --- */}
      <div className="max-w-6xl mx-auto">
        {birthdays.length === 0 ? (
          <div className="border border-dashed border-slate-700 bg-slate-900/20 backdrop-blur-xl p-12 text-center rounded-2xl">
            <Calendar className="mx-auto text-slate-500 size-12 mb-3" />
            <p className="text-slate-400 font-medium">
              No system birthday templates found.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Click the button above to register an event record.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {birthdays.map((item) => (
              <div
                key={item._id}
                className="bg-[#1e293b]/40 backdrop-blur-2xl border border-slate-700/60 rounded-xl overflow-hidden flex flex-col justify-between group shadow-xl"
              >
                <div className="relative h-32 bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center p-4 overflow-hidden border-b border-slate-800">
                  {item.image && (
                    <img
                      src={item.image}
                      className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[1px] group-hover:scale-105 transition-transform duration-300"
                      alt=""
                    />
                  )}
                  <div className="relative text-center z-10">
                    <h4 className="text-white font-bold text-lg truncate drop-shadow-md">
                      {item.heading || "Happy Birthday!"}
                    </h4>
                    <p className="text-xs text-slate-300 font-medium truncate drop-shadow-sm">
                      {item.subHeading}
                    </p>
                  </div>
                  <span
                    className={`absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full font-semibold ${item.isCelebrated ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400" : "bg-amber-500/20 border border-amber-500/30 text-amber-400"}`}
                  >
                    {item.isCelebrated ? "Active Display" : "Muted"}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div className="flex items-center gap-3 bg-slate-900/30 p-2.5 rounded-lg border border-slate-800/60">
                    <img
                      src={item.userId?.profilePic || assets.avatar_icon}
                      className="w-9 h-9 rounded-full object-cover border border-slate-700"
                      alt=""
                    />
                    <div className="overflow-hidden leading-4">
                      <p className="text-sm font-semibold text-white truncate">
                        {item.userId?.fullName || "Unknown Account"}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {item.userId?.email || `ID: ${item.userId}`}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 italic line-clamp-3 bg-slate-900/10 p-2 rounded border border-slate-800/40 flex-1">
                    "{item.message || "No message defined"}"
                  </p>

                  <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 font-medium">
                    <Calendar className="size-3.5 text-blue-400" />
                    <span>
                      Target Date:{" "}
                      {item.dob
                        ? new Date(item.dob).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Unassigned"}
                    </span>
                  </div>
                </div>

                <div className="flex border-t border-slate-800 bg-slate-900/40 p-2.5 justify-end gap-2">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 px-3 py-1.5 rounded font-medium border border-slate-700/50 transition-colors cursor-pointer"
                  >
                    <Edit2 className="size-3.5" /> Modify
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="flex items-center gap-1 text-xs bg-red-950/40 hover:bg-red-900/30 text-red-400 px-3 py-1.5 rounded font-medium border border-red-900/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="size-3.5" /> Drop
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Configuration Form Modal Wrapper --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/40">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Cake className="text-indigo-400 size-5" />
                {editingId
                  ? "Modify Target Celebration Template"
                  : "Initialize New Celebration Card"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 flex flex-col gap-4 max-h-[78vh] overflow-y-auto"
            >
              {/* User Selector Field */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Assign Target User
                </label>
                <div className="relative">
                  <select
                    value={formData.userId}
                    onChange={(e) => {
                      const selectedUser = users.find(
                        (u) => u._id === e.target.value,
                      );
                      setFormData((prev) => ({
                        ...prev,
                        userId: e.target.value,
                        // 🌟 Autofill date if creating fresh template mapping
                        dob:
                          !editingId && selectedUser?.dob
                            ? new Date(selectedUser.dob)
                                .toISOString()
                                .split("T")[0]
                            : prev.dob,
                      }));
                    }}
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none cursor-pointer"
                    required
                    disabled={!!editingId}
                  >
                    <option value="" className="bg-slate-900">
                      -- Choose Account Holder --
                    </option>
                    {users.map((user) => {
                      const currentCelebrant = isBirthdayToday(user.dob);
                      return (
                        <option
                          key={user._id}
                          value={user._id}
                          className="bg-slate-900"
                        >
                          {user.fullName} ({user.email}){" "}
                          {currentCelebrant ? "🌟 [BIRTHDAY TODAY]" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <User className="absolute right-3 top-3 text-slate-500 pointer-events-none size-4" />
                </div>
              </div>

              {/* DOB and Active State Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Date of Anniversary
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, dob: e.target.value }))
                    }
                    className="bg-slate-950/60 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                <div className="flex items-center gap-3 bg-slate-950/30 border border-slate-800 rounded-lg p-3 self-end h-[42px]">
                  <input
                    type="checkbox"
                    id="isCelebrated"
                    checked={formData.isCelebrated}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isCelebrated: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-blue-600 border-slate-700 rounded focus:ring-blue-500 bg-slate-950 cursor-pointer"
                  />
                  <label
                    htmlFor="isCelebrated"
                    className="text-sm font-medium text-slate-300 select-none cursor-pointer"
                  >
                    Enable System Display
                  </label>
                </div>
              </div>

              {/* Text Input Layout Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Primary Heading Text
                  </label>
                  <input
                    type="text"
                    value={formData.heading}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        heading: e.target.value,
                      }))
                    }
                    placeholder="e.g. Rocking 24! 🚀"
                    className="bg-slate-950/60 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Subheading Title
                  </label>
                  <input
                    type="text"
                    value={formData.subHeading}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        subHeading: e.target.value,
                      }))
                    }
                    placeholder="e.g. Wishing you great code days ahead"
                    className="bg-slate-950/60 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Message Block Textarea Area */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  System Banner Description Message
                </label>
                <textarea
                  rows={3}
                  value={formData.message}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  placeholder="Draft your anniversary greeting paragraph..."
                  className="bg-slate-950/60 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* File Attachment Input Canvas Element */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Celebration Graphic Asset Banner
                </label>
                <div className="flex items-center gap-4 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                  <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-3 py-2 rounded text-xs font-medium cursor-pointer transition-colors shrink-0">
                    Browse Graphic
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      hidden
                    />
                  </label>

                  {imagePreview ? (
                    <div className="relative w-full h-14 bg-slate-900 border border-slate-700 rounded overflow-hidden">
                      <img
                        src={imagePreview}
                        className="w-full h-full object-cover"
                        alt="Preview layout"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview("");
                          setFormData((p) => ({ ...p, image: "" }));
                        }}
                        className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-black rounded-full text-red-400 transition-colors cursor-pointer"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 truncate">
                      No image backdrop asset designated.
                    </span>
                  )}
                </div>
              </div>

              {/* Control Submissions Actions Button Layout */}
              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium text-sm px-5 py-2 rounded-lg hover:opacity-95 transition-opacity flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loading
                    ? "Processing..."
                    : editingId
                      ? "Commit Updates"
                      : "Deploy Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBirthdayPage;
