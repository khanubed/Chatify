import Group from "../models/group.js";
import User  from "../models/user.js";
import Message from "../models/message.js";

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
    const groups = await Group.find({ members: userId }).populate(
      "members",
      "fullName profilePic bio",
    );

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
    const { userId } = req.body; // The ID typed into the frontend input

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
