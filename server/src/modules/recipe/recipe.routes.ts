import { Router } from "express";
import { authenticate, authorizeRole, authorizeWithPermission } from "../../middleware/auth.js";
import { UserRole } from "@prisma/client";
import {
  listRecipesHandler,
  getRecipeHandler,
  upsertRecipeHandler,
  deleteRecipeHandler,
} from "./recipe.controller.js";

const router = Router();

router.use(authenticate);

// View recipes - Chef, Manager, Cashier, Super Admin
router.get("/", authorizeRole(UserRole.SUPER_ADMIN, UserRole.FRANCHISE_MANAGER, UserRole.CHEF, UserRole.CASHIER), listRecipesHandler);
router.get("/menu-item/:menuItemId", authorizeRole(UserRole.SUPER_ADMIN, UserRole.FRANCHISE_MANAGER, UserRole.CHEF, UserRole.CASHIER), getRecipeHandler);

// Manage recipes (SOP) - Super Admin or authorized Franchise Manager
router.post("/menu-item/:menuItemId", authorizeWithPermission("canEditMenu"), upsertRecipeHandler);
router.delete("/menu-item/:menuItemId", authorizeWithPermission("canEditMenu"), deleteRecipeHandler);

export default router;