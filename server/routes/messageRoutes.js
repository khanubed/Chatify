import express from "express"
import {  deleteMessage, editMessage, getMessages, getUsersForSideBar, markAsSeen, sendMessage } from "../controllers/messageController.js"
import { secureRoute } from "../middleware/auth.js"

const messageRouter = express.Router()

messageRouter.get("/users",secureRoute,getUsersForSideBar);
messageRouter.get("/:id",secureRoute,getMessages);
messageRouter.put("/mark/:id",secureRoute,markAsSeen);
messageRouter.post("/send/:id",secureRoute,sendMessage);
messageRouter.put(`/edit/:messageId`,secureRoute,editMessage);
messageRouter.delete(`/delete/:messageId`,secureRoute,deleteMessage);
messageRouter.post(`/seen/:chatId`,secureRoute,markAsSeen)

export default messageRouter;
