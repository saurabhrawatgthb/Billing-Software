import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../middleware/error.js";
import { logAudit } from "../../lib/audit.js";
import { emitToFranchise } from "../../lib/socket.js";

// ========================
// CATEGORIES
// ========================

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  description: z.string().trim().optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function listCategories(franchiseId: string | null) {
  const where = franchiseId && franchiseId !== "all" ? { franchiseId } : {};
  return prisma.category.findMany({
    where,
    include: {
      _count: { select: { menuItems: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createCategory(data: z.infer<typeof categorySchema>, franchiseId: string, currentUserId?: string) {
  const existing = await prisma.category.findUnique({
    where: {
      franchiseId_name: {
        franchiseId,
        name: data.name,
      },
    },
  });

  if (existing) {
    throw new AppError("A category with this name already exists in this franchise", 409);
  }

  const category = await prisma.category.create({
    data: {
      franchiseId,
      name: data.name,
      description: data.description,
      isActive: data.isActive,
    },
  });

  await logAudit({
    franchiseId,
    userId: currentUserId,
    action: "CREATE_CATEGORY",
    entity: "Category",
    entityId: category.id,
    newData: category,
  });

  emitToFranchise(franchiseId, "menu:updated", { type: "category_created", data: category });

  return category;
}

export async function updateCategory(
  id: string,
  data: Partial<z.infer<typeof categorySchema>>,
  franchiseId: string,
  currentUserId?: string
) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing || existing.franchiseId !== franchiseId) {
    throw new AppError("Category not found", 404);
  }

  if (data.name && data.name !== existing.name) {
    const conflict = await prisma.category.findUnique({
      where: {
        franchiseId_name: {
          franchiseId,
          name: data.name,
        },
      },
    });
    if (conflict) {
      throw new AppError("A category with this name already exists in this franchise", 409);
    }
  }

  const updated = await prisma.category.update({
    where: { id },
    data,
  });

  await logAudit({
    franchiseId,
    userId: currentUserId,
    action: "UPDATE_CATEGORY",
    entity: "Category",
    entityId: id,
    oldData: existing,
    newData: updated,
  });

  emitToFranchise(franchiseId, "menu:updated", { type: "category_updated", data: updated });

  return updated;
}

export async function deleteCategory(id: string, franchiseId: string, currentUserId?: string) {
  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { menuItems: true } } },
  });

  if (!existing || existing.franchiseId !== franchiseId) {
    throw new AppError("Category not found", 404);
  }

  if (existing._count.menuItems > 0) {
    throw new AppError("Cannot delete category with associated menu items. Move or delete the items first.", 400);
  }

  await prisma.category.delete({ where: { id } });

  await logAudit({
    franchiseId,
    userId: currentUserId,
    action: "DELETE_CATEGORY",
    entity: "Category",
    entityId: id,
    oldData: existing,
  });

  emitToFranchise(franchiseId, "menu:updated", { type: "category_deleted", id });

  return { success: true, message: "Category deleted" };
}

// ========================
// MENU ITEMS
// ========================

export const menuItemSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  stationId: z.string().optional().nullable(),
  name: z.string().trim().min(1, "Item name is required"),
  code: z.string().trim().min(1, "Dish code is required").transform((val) => val.toUpperCase()),
  description: z.string().trim().optional().nullable(),
  price: z.number().positive("Price must be greater than 0"),
  hasSizes: z.boolean().optional(),
  priceSmall: z.number().positive().optional().nullable(),
  priceMedium: z.number().positive().optional().nullable(),
  priceLarge: z.number().positive().optional().nullable(),
  isAvailable: z.boolean().default(true),
});

export const updateMenuItemSchema = menuItemSchema.partial();

export async function listMenuItems(
  franchiseId: string | null,
  filters: { categoryId?: string; isAvailable?: boolean; stationId?: string }
) {
  const where: Prisma.MenuItemWhereInput = {
    ...(franchiseId && franchiseId !== "all" ? { franchiseId } : {}),
    categoryId: filters.categoryId || undefined,
    stationId: filters.stationId || undefined,
    isAvailable: filters.isAvailable !== undefined ? filters.isAvailable : undefined,
  };

  return prisma.menuItem.findMany({
    where,
    include: {
      category: {
        select: { id: true, name: true },
      },
      station: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });
}

export async function getMenuItemById(id: string, franchiseId: string | null) {
  const item = await prisma.menuItem.findUnique({
    where: { id },
    include: {
      category: true,
      station: true,
    },
  });

  if (!item || (franchiseId && item.franchiseId !== franchiseId)) {
    throw new AppError("Menu item not found", 404);
  }

  return item;
}

export async function createMenuItem(
  data: z.infer<typeof menuItemSchema>,
  franchiseId: string,
  currentUserId?: string
) {
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category || category.franchiseId !== franchiseId) {
    throw new AppError("Invalid category selected for this franchise", 400);
  }

  if (data.stationId) {
    const station = await prisma.preparationStation.findUnique({ where: { id: data.stationId } });
    if (!station || station.franchiseId !== franchiseId) {
      throw new AppError("Invalid preparation station selected for this franchise", 400);
    }
  }

  const existingCode = await prisma.menuItem.findUnique({
    where: {
      franchiseId_code: {
        franchiseId,
        code: data.code,
      },
    },
  });
  if (existingCode) {
    throw new AppError(`A dish with code "${data.code}" already exists in this franchise`, 409);
  }

  const item = await prisma.menuItem.create({
    data: {
      franchiseId,
      categoryId: data.categoryId,
      stationId: data.stationId || null,
      name: data.name,
      code: data.code,
      description: data.description,
      price: Number(data.price),
      hasSizes: Boolean(data.hasSizes),
      priceSmall: data.priceSmall !== undefined && data.priceSmall !== null ? Number(data.priceSmall) : null,
      priceMedium: data.priceMedium !== undefined && data.priceMedium !== null ? Number(data.priceMedium) : null,
      priceLarge: data.priceLarge !== undefined && data.priceLarge !== null ? Number(data.priceLarge) : null,
      isAvailable: data.isAvailable,
    },
    include: {
      category: true,
      station: true,
    },
  });

  await logAudit({
    franchiseId,
    userId: currentUserId,
    action: "CREATE_MENU_ITEM",
    entity: "MenuItem",
    entityId: item.id,
    newData: item,
  });

  emitToFranchise(franchiseId, "menu:updated", { type: "item_created", data: item });

  return item;
}

export async function updateMenuItem(
  id: string,
  data: z.infer<typeof updateMenuItemSchema>,
  franchiseId: string,
  currentUserId?: string
) {
  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing || existing.franchiseId !== franchiseId) {
    throw new AppError("Menu item not found", 404);
  }

  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category || category.franchiseId !== franchiseId) {
      throw new AppError("Invalid category selected", 400);
    }
  }

  if (data.stationId) {
    const station = await prisma.preparationStation.findUnique({ where: { id: data.stationId } });
    if (!station || station.franchiseId !== franchiseId) {
      throw new AppError("Invalid preparation station selected", 400);
    }
  }

  if (data.code && data.code !== existing.code) {
    const conflict = await prisma.menuItem.findUnique({
      where: {
        franchiseId_code: {
          franchiseId,
          code: data.code,
        },
      },
    });
    if (conflict) {
      throw new AppError(`A dish with code "${data.code}" already exists in this franchise`, 409);
    }
  }

  const updated = await prisma.menuItem.update({
    where: { id },
    data: {
      categoryId: data.categoryId,
      stationId: data.stationId !== undefined ? (data.stationId || null) : undefined,
      name: data.name,
      code: data.code,
      description: data.description,
      price: data.price !== undefined ? Number(data.price) : undefined,
      hasSizes: data.hasSizes !== undefined ? Boolean(data.hasSizes) : undefined,
      priceSmall: data.priceSmall !== undefined ? (data.priceSmall !== null ? Number(data.priceSmall) : null) : undefined,
      priceMedium: data.priceMedium !== undefined ? (data.priceMedium !== null ? Number(data.priceMedium) : null) : undefined,
      priceLarge: data.priceLarge !== undefined ? (data.priceLarge !== null ? Number(data.priceLarge) : null) : undefined,
      isAvailable: data.isAvailable,
    },
    include: {
      category: true,
      station: true,
    },
  });

  await logAudit({
    franchiseId,
    userId: currentUserId,
    action: "UPDATE_MENU_ITEM",
    entity: "MenuItem",
    entityId: id,
    oldData: existing,
    newData: updated,
  });

  emitToFranchise(franchiseId, "menu:updated", { type: "item_updated", data: updated });

  return updated;
}

export async function setMenuItemAvailability(
  id: string,
  isAvailable: boolean,
  franchiseId: string,
  currentUserId?: string
) {
  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing || existing.franchiseId !== franchiseId) {
    throw new AppError("Menu item not found", 404);
  }

  const updated = await prisma.menuItem.update({
    where: { id },
    data: { isAvailable },
    include: { category: true, station: true },
  });

  await logAudit({
    franchiseId,
    userId: currentUserId,
    action: isAvailable ? "ENABLE_MENU_ITEM" : "DISABLE_MENU_ITEM",
    entity: "MenuItem",
    entityId: id,
    oldData: { isAvailable: existing.isAvailable },
    newData: { isAvailable },
  });

  emitToFranchise(franchiseId, "menu:updated", { type: "availability_changed", data: updated });

  return updated;
}

// ========================
// PREPARATION STATIONS
// ========================

export async function listStations(franchiseId: string | null) {
  const where = franchiseId && franchiseId !== "all" ? { franchiseId } : {};

  return prisma.preparationStation.findMany({
    where,
    include: {
      printers: true,
      _count: { select: { menuItems: true, kots: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createStation(name: string, franchiseId: string, currentUserId?: string) {
  const existing = await prisma.preparationStation.findUnique({
    where: {
      franchiseId_name: {
        franchiseId,
        name: name.trim(),
      },
    },
  });

  if (existing) {
    throw new AppError("Station with this name already exists", 409);
  }

  const station = await prisma.preparationStation.create({
    data: {
      franchiseId,
      name: name.trim(),
    },
  });

  await logAudit({
    franchiseId,
    userId: currentUserId,
    action: "CREATE_STATION",
    entity: "PreparationStation",
    entityId: station.id,
    newData: station,
  });

  emitToFranchise(franchiseId, "menu:updated", { type: "station_created", data: station });

  return station;
}

// ========================
// CLONE MENU BETWEEN FRANCHISES
// ========================

export const cloneMenuSchema = z.object({
  sourceFranchiseId: z.string().min(1, "Source franchise is required"),
  targetFranchiseId: z.string().min(1, "Target franchise is required"),
  mode: z.enum(["MERGE", "REPLACE"]).default("MERGE"),
  priceAdjustmentPercent: z.number().optional().default(0),
  copyStations: z.boolean().optional().default(true),
});

export type CloneMenuInput = z.infer<typeof cloneMenuSchema>;

export async function cloneFranchiseMenu(input: CloneMenuInput, currentUserId?: string) {
  const { sourceFranchiseId, targetFranchiseId, mode, priceAdjustmentPercent, copyStations } = input;

  if (sourceFranchiseId === targetFranchiseId) {
    throw new AppError("Source and target franchises cannot be the same", 400);
  }

  const [sourceFranchise, targetFranchise] = await Promise.all([
    prisma.franchise.findUnique({ where: { id: sourceFranchiseId } }),
    prisma.franchise.findUnique({ where: { id: targetFranchiseId } }),
  ]);

  if (!sourceFranchise) throw new AppError("Source franchise not found", 404);
  if (!targetFranchise) throw new AppError("Target franchise not found", 404);

  // 1. Fetch all source categories, stations, items
  const [sourceCategories, sourceStations, sourceItems] = await Promise.all([
    prisma.category.findMany({ where: { franchiseId: sourceFranchiseId } }),
    prisma.preparationStation.findMany({ where: { franchiseId: sourceFranchiseId } }),
    prisma.menuItem.findMany({ where: { franchiseId: sourceFranchiseId } }),
  ]);

  if (sourceCategories.length === 0 && sourceItems.length === 0) {
    throw new AppError(`Source franchise (${sourceFranchise.name}) has no menu categories or dishes to copy`, 400);
  }

  return prisma.$transaction(async (tx) => {
    // If mode is REPLACE, remove target items if not yet ordered
    if (mode === "REPLACE") {
      const orderCount = await tx.orderItem.count({
        where: { order: { franchiseId: targetFranchiseId } },
      });
      if (orderCount === 0) {
        await tx.menuItem.deleteMany({ where: { franchiseId: targetFranchiseId } });
        await tx.category.deleteMany({ where: { franchiseId: targetFranchiseId } });
      }
    }

    // 2. Map or create stations in target franchise
    const stationMap = new Map<string, string>();
    if (copyStations) {
      for (const st of sourceStations) {
        const existing = await tx.preparationStation.findUnique({
          where: {
            franchiseId_name: {
              franchiseId: targetFranchiseId,
              name: st.name,
            },
          },
        });
        if (existing) {
          stationMap.set(st.id, existing.id);
        } else {
          const created = await tx.preparationStation.create({
            data: {
              franchiseId: targetFranchiseId,
              name: st.name,
            },
          });
          stationMap.set(st.id, created.id);
        }
      }
    }

    // 3. Map or create categories in target franchise
    const categoryMap = new Map<string, string>();
    let categoriesCreated = 0;
    for (const cat of sourceCategories) {
      const existing = await tx.category.findUnique({
        where: {
          franchiseId_name: {
            franchiseId: targetFranchiseId,
            name: cat.name,
          },
        },
      });
      if (existing) {
        categoryMap.set(cat.id, existing.id);
      } else {
        const created = await tx.category.create({
          data: {
            franchiseId: targetFranchiseId,
            name: cat.name,
            description: cat.description,
            isActive: cat.isActive,
          },
        });
        categoryMap.set(cat.id, created.id);
        categoriesCreated++;
      }
    }

    // 4. Map and clone menu items
    let itemsCreated = 0;
    let itemsUpdated = 0;

    for (const item of sourceItems) {
      const targetCatId = categoryMap.get(item.categoryId);
      if (!targetCatId) continue;

      const targetStationId = item.stationId ? (stationMap.get(item.stationId) || null) : null;

      // Price calculation
      let price = Number(item.price);
      if (priceAdjustmentPercent && priceAdjustmentPercent !== 0) {
        price = Math.round((price * (1 + priceAdjustmentPercent / 100)) * 100) / 100;
      }

      // Check if item code already exists in target franchise
      const existingItem = await tx.menuItem.findUnique({
        where: {
          franchiseId_code: {
            franchiseId: targetFranchiseId,
            code: item.code,
          },
        },
      });

      if (existingItem) {
        await tx.menuItem.update({
          where: { id: existingItem.id },
          data: {
            name: item.name,
            categoryId: targetCatId,
            stationId: targetStationId,
            description: item.description,
            price,
            isAvailable: item.isAvailable,
          },
        });
        itemsUpdated++;
      } else {
        await tx.menuItem.create({
          data: {
            franchiseId: targetFranchiseId,
            categoryId: targetCatId,
            stationId: targetStationId,
            name: item.name,
            code: item.code,
            description: item.description,
            price,
            isAvailable: item.isAvailable,
          },
        });
        itemsCreated++;
      }
    }

    await logAudit({
      franchiseId: targetFranchiseId,
      userId: currentUserId,
      action: "CLONE_MENU",
      entity: "Menu",
      entityId: targetFranchiseId,
      newData: {
        sourceFranchise: sourceFranchise.name,
        targetFranchise: targetFranchise.name,
        categoriesCreated,
        itemsCreated,
        itemsUpdated,
        priceAdjustmentPercent,
      },
    });

    const result = {
      sourceFranchiseName: sourceFranchise.name,
      targetFranchiseName: targetFranchise.name,
      categoriesCount: categoriesCreated + (sourceCategories.length - categoriesCreated),
      categoriesCreated,
      itemsCreated,
      itemsUpdated,
      totalItems: itemsCreated + itemsUpdated,
    };

    emitToFranchise(targetFranchiseId, "menu:updated", { type: "menu_cloned", data: result });

    return result;
  });
}
