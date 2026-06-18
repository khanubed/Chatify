import Group from "../models/group.js";
import User from "../models/user.js";
import Message from "../models/message.js";
import { io, userSocketMap } from "../server.js";

export const createGroup = async (req, res) => {
  try {
    const { name, members } = req.body;
    const creatorId = req.user._id;

    // Ensure creator is included in the member list
    const allMembers = Array.from(new Set([...members, creatorId.toString()]));

    const newGroup = await Group.create({
      name,
      createdBy: creatorId,
      members: allMembers,
    });

    const populatedGroup = await Group.findById(newGroup._id).populate(
      "members",
      "fullName profilePic bio",
    );

    allMembers.forEach((memberId) => {
      const memberSocketId = userSocketMap[memberId];

      if (memberSocketId) {
        io.to(memberSocketId).emit("groupCreated", populatedGroup);
      }
    });

    res.status(201).json({ success: true, group: populatedGroup });
  } catch (error) {
    console.error("Error in createGroup controller:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find()
      .populate("members", "fullName _id profilePic bio")
      .populate("createdBy", "fullName profilePic bio")
      .populate("requests", "fullName _id profilePic");

    const unseenGroups = {};

    const promises = groups.map(async (group) => {
      const count = await Message.countDocuments({
        groupId: group._id,
        senderId: { $ne: userId },
        seenBy: { $ne: userId },
      });

      if (count > 0) {
        unseenGroups[group._id.toString()] = count;
      }
    });

    await Promise.all(promises);

    // console.log("groups", groups);

    res.status(200).json({ success: true, groups, unseenGroups });
  } catch (error) {
    console.error("Error in getGroups controller:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const markGroupAsSeen = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user._id;

    await Message.updateMany(
      {
        groupId: groupId,
        seenBy: { $ne: userId },
        senderId: { $ne: userId },
      },
      {
        $addToSet: { seenBy: userId },
      },
    );

    res.json({ success: true });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const addGroupMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // 1. Verify target user exists in the database
    const userToAdd = await User.findById(userId).select("-password");
    if (!userToAdd) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Find the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group workspace not found" });
    }

    // 3. Check if user is already a member of this group
    const isAlreadyMember = group.members.some(
      (memberId) => memberId.toString() === userId,
    );
    if (isAlreadyMember) {
      return res
        .status(400)
        .json({ message: "User is already a member of this group" });
    }

    // 4. Push user ID to group array and save
    group.members.push(userId);
    await group.save();

    // 5. Return the new member profile back to frontend to instantly update state
    res.status(200).json({
      message: "Member added successfully",
      newMember: {
        _id: userToAdd._id,
        fullName: userToAdd.fullName,
        profilePic: userToAdd.profilePic,
      },
    });
  } catch (error) {
    console.error("Error in addGroupMember controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getNonGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;

    // 1. Find the target group to see who is currently a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group workspace not found" });
    }

    // 2. Fetch all users whose IDs are NOT inside the group.members array
    // We also exclude the password field for security
    const eligibleUsers = await User.find({
      _id: { $nin: group.members },
    }).select("fullName profilePic bio");

    // 3. Send the clean list back to the frontend
    res.status(200).json(eligibleUsers);
  } catch (error) {
    console.error("Error in getNonGroupMembers controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id; // Extracted from your auth middleware

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Remove the user from the members array
    group.members = group.members.filter(
      (memberId) => memberId.toString() !== userId.toString(),
    );

    // Optional Edge Case: If the last member leaves, delete the group entirely
    if (group.members.length === 0) {
      await Group.findByIdAndDelete(groupId);
      return res
        .status(200)
        .json({ message: "Left group, group disbanded as it was empty." });
    }

    const username = req.user.fullName;
    const groupName = group.name;

    await group.save();

    // Pro-Tip: Notify other members via WebSockets that someone left
    io.to(groupId).emit("userGroupDeleted", { groupName, username });

    res.status(200).json({ message: "Successfully left the group", group });
  } catch (error) {
    console.error("Error leaving group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Dispatch a request execution context
export const requestToJoin = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.members.includes(userId)) {
      return res.status(400).json({ message: "You are already a member" });
    }

    if (group.requests.includes(userId)) {
      return res.status(400).json({ message: "Request already pending" });
    }

    group.requests.push(userId);
    await group.save();

    const adminId = group.createdBy;

    const adminSocketId = userSocketMap[adminId];
    if (adminSocketId) {
      io.to(adminSocketId).emit("requestedToJoin");
    }

    res.status(200).json({ success: true, message: "Join request submitted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Process Administrative Request Resolutions
export const handleJoinRequest = async (req, res) => {
  try {
    const { groupId, applicantId, action } = req.body;
    const adminId = req.user._id;

    console.log("adminId", adminId);
    console.log("applicantId", applicantId);
    console.log("action", action);
    console.log("groupId", groupId);

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (!group.members.includes(adminId)) {

      console.log("Group members", group.members);
      console.log("Admin ID", adminId);

      return res
        .status(400)
        .json({ error: "You are not authorized to perform this action" });
    }

    if (action === "accept") {
      await Group.findByIdAndUpdate(groupId, {
        $pull: { requests: applicantId },
        $addToSet: { members: applicantId },
      });
    } else {
      await Group.findByIdAndUpdate(groupId, {
        $pull: { requests: applicantId },
      });
    }

    const username = req.user.fullName;
    const groupName = group.name;

    const userSocketId = userSocketMap[applicantId];
    if (userSocketId) {
      io.to(userSocketId).emit("requestAction", { groupName: group.name, action });
    }

    res
      .status(200)
      .json({ success: true, message: `Request ${action}ed successfully` });
  } catch (error) {
    res.status(500).json({ message: error.message });
    console.error("Error handling join request:", error.message);
  }
};
