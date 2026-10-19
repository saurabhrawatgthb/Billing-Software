import { Router } from "express";
import { authenticate, authorize, authorizeWithPermission } from "../../middleware/auth.js";
import {
  addCategory,
  addItem,
  addStation,
  editCategory,
  editItem,
  getCategories,
  getItem,
  getItems,
  getStations,
  removeCategory,
  toggleAvailability,
  cloneMenu,
} from "./menu.controller.js";

const router = Router();

router.use(authenticate);

// Clone Menu Across Franchises (Super Admin or authorized Franchise Manager)
router.post("/clone", authorizeWithPermission("canEditMenu"), cloneMenu);

// Categories
router.get("/categories", getCategories);
router.post("/categories", authorizeWithPermission("canEditMenu"), addCategory);
router.put("/categories/:id", authorizeWithPermission("canEditMenu"), editCategory);
router.delete("/categories/:id", authorizeWithPermission("canEditMenu"), removeCategory);

// Stations
router.get("/stations", getStations);
router.post("/stations", authorizeWithPermission("canEditMenu"), addStation);

// Items
router.get("/items", getItems);
router.get("/items/:id", getItem);
router.post("/items", authorizeWithPermission("canEditMenu"), addItem);
router.put("/items/:id", authorizeWithPermission("canEditPrices"), editItem);
router.patch("/items/:id/availability", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "CHEF"), toggleAvailability);

export default router;
