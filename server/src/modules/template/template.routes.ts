import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { listTemplates, getActiveTemplate, saveTemplate } from "./template.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", listTemplates);
router.get("/active", getActiveTemplate);
router.post("/", saveTemplate);
router.put("/", saveTemplate);

export default router;
