import { Router } from "express";

import { login, me, getLinkedProfiles, switchProfile, handlePlatformRegister } from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.post("/login", login);
router.post("/platform-register", handlePlatformRegister);
router.get("/me", authenticate, me);
router.get("/my-accounts", authenticate, getLinkedProfiles);
router.post("/switch-account", authenticate, switchProfile);

export default router;