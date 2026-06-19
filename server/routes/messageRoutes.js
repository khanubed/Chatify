import express from "express"
import {   getMessages, getUsersForSideBar, uploadAsset } from "../controllers/messageController.js"
import { secureRoute } from "../middleware/auth.js"
import { upload } from "../lib/multer.js";

const messageRouter = express.Router()

messageRouter.get("/users",secureRoute,getUsersForSideBar);
messageRouter.get("/:id",secureRoute,getMessages);
messageRouter.post("/upload-asset", secureRoute, upload.single("file"), uploadAsset);
// messageRouter.put("/mark/:id",secureRoute,markAsSeen);
// // messageRouter.post("/send/:id",secureRoute,upload.single("file"),sendMessage);
// messageRouter.put(`/edit/:messageId`,secureRoute ,editMessage);
// messageRouter.delete(`/delete/:messageId`,secureRoute,deleteMessage);
// messageRouter.post(`/seen/:chatId`,secureRoute,markAsSeen)
// messageRouter.patch(`/:messageId/reaction`,secureRoute, toggleReaction)

export default messageRouter;
