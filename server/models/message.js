import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    text: { type: String },
    image: { type: String },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        emoji: { type: String, required: true },
      },
    ], 
    audio: {
      type: String,
      default: null,
    },
    video : {
      type : String,
      default: null,
    },
    isForwarded : {
      type : Boolean,
      default : false
    },
    forwardedFrom : {
      type : mongoose.Schema.Types.ObjectId,
      ref : "User",
      default : null
    }
  },
  { timestamps: true },
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
