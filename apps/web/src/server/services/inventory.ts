import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client";

export class InsufficientStockError extends Error {
  constructor(public variantId: string, public requested: number, public available: number) {
    super(`Insufficient stock for variant ${variantId}: requested ${requested}, available ${available}`);
    this.name = "InsufficientStockError";
  }
}

export interface ReserveStockItem {
  variantId: string;
  quantity: number;
}

/**
 * Atomically reserve inventory for an order.
 * Uses DB transaction to ensure consistency.
 * Throws InsufficientStockError if not enough stock.
 */
export async function reserveStock(items: ReserveStockItem[]) {
  return await prisma.$transaction(async (tx) => {
    const reserved: { variantId: string; qty: number }[] = [];

    for (const item of items) {
      // Lock row and check availability
      const inventory = await tx.inventory.findUnique({
        where: { variantId: item.variantId },
      });

      if (!inventory) {
        throw new Error(`Inventory record not found for variant ${item.variantId}`);
      }

      const availableQty = inventory.qtyAvailable - inventory.qtyReserved;

      if (availableQty < item.quantity) {
        throw new InsufficientStockError(item.variantId, item.quantity, availableQty);
      }

      // Reserve stock
      await tx.inventory.update({
        where: { variantId: item.variantId },
        data: {
          qtyReserved: { increment: item.quantity },
        },
      });

      reserved.push({ variantId: item.variantId, qty: item.quantity });
    }

    return reserved;
  });
}

/**
 * Commit reserved stock to actual sale (decrement qtyAvailable).
 * Call this after payment is approved.
 */
export async function commitStock(items: ReserveStockItem[]) {
  return await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.inventory.update({
        where: { variantId: item.variantId },
        data: {
          qtyAvailable: { decrement: item.quantity },
          qtyReserved: { decrement: item.quantity },
        },
      });
    }
  });
}

/**
 * Release reserved stock (rollback).
 * Call this if payment fails or order is cancelled.
 */
export async function releaseStock(items: ReserveStockItem[]) {
  return await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.inventory.update({
        where: { variantId: item.variantId },
        data: {
          qtyReserved: { decrement: item.quantity },
        },
      });
    }
  });
}

/**
 * Check if stock is available for all items.
 * Non-transactional check (for cart validation).
 */
export async function checkStockAvailable(items: ReserveStockItem[]): Promise<boolean> {
  for (const item of items) {
    const inventory = await prisma.inventory.findUnique({
      where: { variantId: item.variantId },
    });

    if (!inventory) return false;

    const available = inventory.qtyAvailable - inventory.qtyReserved;
    if (available < item.quantity) return false;
  }

  return true;
}
