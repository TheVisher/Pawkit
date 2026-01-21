/**
 * Bills Payment Tracker
 * Stores and retrieves paid bill status using Dexie metadata table
 * Resets monthly - each month has its own set of paid bills
 */

import { db } from '@/lib/db';
import { format } from 'date-fns';

interface BillsPaymentData {
  paidCardIds: string[];
}

/**
 * Get the current month key (e.g., "2026-01")
 */
export function getCurrentMonthKey(): string {
  return format(new Date(), 'yyyy-MM');
}

/**
 * Get the metadata key for a month's paid bills
 */
function getMetadataKey(monthKey?: string): string {
  return `billsPaid:${monthKey || getCurrentMonthKey()}`;
}

/**
 * Get paid card IDs for a month
 * Defaults to current month if not specified
 */
export async function getPaidBills(monthKey?: string): Promise<string[]> {
  const key = getMetadataKey(monthKey);
  const entry = await db.metadata.get(key);

  if (!entry || !entry.value) {
    return [];
  }

  const data = entry.value as BillsPaymentData;
  return data.paidCardIds || [];
}

/**
 * Mark a bill as paid for a month
 * Defaults to current month if not specified
 */
export async function markBillPaid(cardId: string, monthKey?: string): Promise<void> {
  const key = getMetadataKey(monthKey);
  const existingPaid = await getPaidBills(monthKey);

  if (existingPaid.includes(cardId)) {
    return; // Already paid
  }

  const newData: BillsPaymentData = {
    paidCardIds: [...existingPaid, cardId],
  };

  await db.metadata.put({ key, value: newData });
}

/**
 * Mark a bill as unpaid for a month
 * Defaults to current month if not specified
 */
export async function markBillUnpaid(cardId: string, monthKey?: string): Promise<void> {
  const key = getMetadataKey(monthKey);
  const existingPaid = await getPaidBills(monthKey);

  if (!existingPaid.includes(cardId)) {
    return; // Already unpaid
  }

  const newData: BillsPaymentData = {
    paidCardIds: existingPaid.filter((id) => id !== cardId),
  };

  await db.metadata.put({ key, value: newData });
}

/**
 * Check if a bill is paid for a month
 * Defaults to current month if not specified
 */
export async function isBillPaid(cardId: string, monthKey?: string): Promise<boolean> {
  const paidIds = await getPaidBills(monthKey);
  return paidIds.includes(cardId);
}

/**
 * Toggle a bill's paid status
 * Returns the new paid status
 */
export async function toggleBillPaid(cardId: string, monthKey?: string): Promise<boolean> {
  const isPaid = await isBillPaid(cardId, monthKey);

  if (isPaid) {
    await markBillUnpaid(cardId, monthKey);
    return false;
  } else {
    await markBillPaid(cardId, monthKey);
    return true;
  }
}

/**
 * Clear all paid bills for a month (useful for testing)
 */
export async function clearPaidBills(monthKey?: string): Promise<void> {
  const key = getMetadataKey(monthKey);
  await db.metadata.delete(key);
}
