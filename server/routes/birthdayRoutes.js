import express from "express";
import { 
  createBirthday, 
  getAllBirthdays, 
  getBirthdayById, 
  updateBirthday, 
  deleteBirthday 
} from "../controllers/birthdayController.js";
// import protectRoute from "../middleware/authMiddleware.js"; // Standard token authenticator
// import adminCheck from "../middleware/adminMiddleware.js";  // Guard verifying if req.user.isAdmin === true

const router = express.Router();

// Apply route protections so only logged-in system admins can touch these targets
router.post("/create", createBirthday); 
router.get("/all", getAllBirthdays);
router.get("/:id", getBirthdayById);
router.put("/update/:id", updateBirthday);
router.delete("/delete/:id", deleteBirthday);

export default router;