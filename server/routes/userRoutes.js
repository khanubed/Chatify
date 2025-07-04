import express from "express"
import { authCheck, login, editProfile, signup } from "../controllers/userController.js";
import { secureRoute } from "../middleware/auth.js";

const userRouter = express.Router();

userRouter.post("/signup",signup);
userRouter.post("/login",login);
userRouter.put("/edit-profile",secureRoute , editProfile);
userRouter.get("/check",secureRoute , authCheck);

export default userRouter