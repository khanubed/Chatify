import express from "express";
import { secureRoute } from "../middleware/auth.js";
import { addGroupMember, createGroup, getGroups, getNonGroupMembers, markGroupAsSeen } from "../controllers/groupController.js";
const groupRouter = express.Router();


groupRouter.post("/create",secureRoute,createGroup)
groupRouter.get("/all",secureRoute,getGroups)
groupRouter.put("/mark/:id",secureRoute , markGroupAsSeen)
groupRouter.post("/:groupId/add", secureRoute, addGroupMember)
groupRouter.get("/:groupId/non-members", secureRoute, getNonGroupMembers);


export default groupRouter;