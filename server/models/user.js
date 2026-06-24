import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    password: { type: String, required: true, minlength: 6 },
    profilePic: { type: String, default: "" },
    bio: { type: String },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dob: { type: Date , default : Date.now() },
    isCelebrated: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

export default User;
