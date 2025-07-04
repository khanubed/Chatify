import express from "express"
import { getMessages, getUsersForSideBar, markMessageAsSeen, sendMessage } from "../controllers/messageController.js"
import { secureRoute } from "../middleware/auth.js"

const messageRouter = express.Router()

messageRouter.get("/users",secureRoute,getUsersForSideBar);
messageRouter.get("/:id",secureRoute,getMessages);
messageRouter.put("/mark/:id",secureRoute,markMessageAsSeen);
messageRouter.post("/send/:id",secureRoute,sendMessage);

export default messageRouter;
