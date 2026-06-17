import express from "express";
import { secureRoute } from "../middleware/auth.js";
import { addGroupMember, createGroup, getGroups, getNonGroupMembers, handleJoinRequest, leaveGroup, markGroupAsSeen, requestToJoin } from "../controllers/groupController.js";
const groupRouter = express.Router();


groupRouter.post("/create",secureRoute,createGroup)
groupRouter.get("/all",secureRoute,getGroups)
groupRouter.put("/mark/:id",secureRoute , markGroupAsSeen)
groupRouter.post("/:groupId/add", secureRoute, addGroupMember)
groupRouter.get("/:groupId/non-members", secureRoute, getNonGroupMembers);
groupRouter.patch("/:groupId/leave", secureRoute, leaveGroup)
groupRouter.post(`/request/:groupId` , secureRoute , requestToJoin)
groupRouter.post(`/resolve-request`, secureRoute , handleJoinRequest )

export default groupRouter;