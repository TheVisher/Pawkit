'use client';

/**
 * Bills Widget
 * Shows subscription bills with monthly payment tracking
 */

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { CreditCard, Check, AlertCircle, Clock, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useCards } from '@/lib/hooks/use-live-data';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { useDataStore } from '@/lib/stores/data-store';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import {
  getSubscriptionsFromCards,
  groupSubscriptions,
  calculateMonthlyTotal,
  formatAmount,
  formatDayWithOrdinal,
  type SubscriptionInfo,
} from '@/lib/utils/parse-subscription-info';
import {
  getPaidBills,
  markBillPaid,
  markBillUnpaid,
  getCurrentMonthKey,
} from '@/lib/utils/bills-payment-tracker';
import {
  markMonthPaid,
  markMonthUnpaid,
  markMonthMissed,
  getMonthStatus,
  ensurePaymentHistorySection,
} from '@/lib/utils/update-payment-history';

interface BillItemProps {
  subscription: SubscriptionInfo;
  isPaid: boolean;
  onTogglePaid: (cardId: string, paid: boolean) => void;
  onClick: () => void;
}

function BillItem({ subscription, isPaid, onTogglePaid, onClick }: BillItemProps) {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePaid(subscription.cardId, !isPaid);
  };

  // Determine warning state
  const showWarning = !isPaid && subscription.isDueSoon;
  const showAlert = !isPaid && subscription.isPastDue;

  return (
    <div
      className={cn(
        'group flex items-center gap-2 py-1.5 px-1.5 rounded-lg transition-colors',
        'hover:bg-bg-surface-3/50',
        isPaid && 'opacity-60'
      )}
    >
      <button
        onClick={handleCheckboxClick}
        className={cn(
          'shrink-0 w-4 h-4 rounded border transition-colors flex items-center justify-center',
          isPaid
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-text-muted/40 hover:border-emerald-500'
        )}
      >
        {isPaid && <Check className="w-3 h-3 text-white" />}
      </button>
      <button
        onClick={onClick}
        className="flex-1 min-w-0 text-left flex items-center gap-2 group/bill"
      >
        <div className="flex-1 min-w-0 flex items-center gap-1">
          <p className={cn(
            'text-sm text-text-primary truncate',
            isPaid && 'line-through'
          )}>
            {subscription.cardTitle}
          </p>
          <ArrowUpRight className="w-3 h-3 text-text-muted/50 opacity-0 group-hover/bill:opacity-100 transition-opacity shrink-0" />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {showAlert && (
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          )}
          {showWarning && !showAlert && (
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span className="text-xs text-text-muted">
            {formatDayWithOrdinal(subscription.renewalDay)}
          </span>
          <span className={cn(
            'text-sm font-medium',
            isPaid ? 'text-text-muted' : 'text-text-primary'
          )}>
            {formatAmount(subscription.amount)}
          </span>
        </div>
      </button>
    </div>
  );
}

interface BillSectionProps {
  title: string;
  bills: SubscriptionInfo[];
  paidCardIds: string[];
  onTogglePaid: (cardId: string, paid: boolean) => void;
  onCardClick: (cardId: string) => void;
}

function BillSection({ title, bills, paidCardIds, onTogglePaid, onCardClick }: BillSectionProps) {
  if (bills.length === 0) return null;

  return (
    <div className="space-y-0.5">
      <p className="text-xs text-text-muted/70 uppercase tracking-wide px-1.5 py-1">
        {title}
      </p>
      {bills.map((bill) => (
        <BillItem
          key={bill.cardId}
          subscription={bill}
          isPaid={paidCardIds.includes(bill.cardId)}
          onTogglePaid={onTogglePaid}
          onClick={() => onCardClick(bill.cardId)}
        />
      ))}
    </div>
  );
}

export function BillsWidget() {
  const workspace = useCurrentWorkspace();
  const cards = useCards(workspace?.id);
  const openCardDetail = useModalStore((s) => s.openCardDetail);
  const updateCard = useDataStore((s) => s.updateCard);

  const [paidCardIds, setPaidCardIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasCheckedMissedPayments = useRef(false);

  // Load paid bills on mount
  useEffect(() => {
    getPaidBills().then((ids) => {
      setPaidCardIds(ids);
      setIsLoading(false);
    });
  }, []);

  // Get all subscription cards
  const subscriptions = useMemo(() => {
    return getSubscriptionsFromCards(cards);
  }, [cards]);

  // Check for missed payments on mount (only once per session)
  useEffect(() => {
    if (hasCheckedMissedPayments.current || subscriptions.length === 0) return;
    hasCheckedMissedPayments.current = true;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Only check if we're not in January (nothing to miss yet in a new year)
    if (currentMonth === 0) return;

    const previousMonth = currentMonth - 1;

    // Check each subscription for missed payments in previous month
    const checkMissedPayments = async () => {
      for (const sub of subscriptions) {
        // Fetch fresh card from Dexie to avoid stale data
        const freshCard = await db.cards.get(sub.cardId);
        if (!freshCard || !freshCard.content) continue;

        // Check if previous month is empty (not paid, not missed)
        const status = getMonthStatus(freshCard.content, currentYear, previousMonth);
        if (status === 'empty') {
          // Mark as missed
          const updatedContent = markMonthMissed(freshCard.content, currentYear, previousMonth);
          await updateCard(freshCard.id, { content: updatedContent });
        }
      }
    };

    checkMissedPayments();
  }, [subscriptions, updateCard]);

  // Group subscriptions by status
  const grouped = useMemo(() => {
    return groupSubscriptions(subscriptions, paidCardIds);
  }, [subscriptions, paidCardIds]);

  // Calculate totals
  const monthlyTotal = useMemo(() => {
    return calculateMonthlyTotal(subscriptions);
  }, [subscriptions]);

  const paidCount = grouped.paid.length;
  const totalCount = subscriptions.length;

  // Toggle paid status
  const handleTogglePaid = useCallback(async (cardId: string, paid: boolean) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Optimistic update for widget state
    if (paid) {
      setPaidCardIds((prev) => [...prev, cardId]);
      await markBillPaid(cardId);
    } else {
      setPaidCardIds((prev) => prev.filter((id) => id !== cardId));
      await markBillUnpaid(cardId);
    }

    // Fetch the latest card directly from Dexie to avoid stale data conflicts
    const freshCard = await db.cards.get(cardId);
    if (freshCard && freshCard.content) {
      const updatedContent = paid
        ? markMonthPaid(freshCard.content, currentYear, currentMonth)
        : markMonthUnpaid(freshCard.content, currentYear, currentMonth);
      await updateCard(cardId, { content: updatedContent });
    }
  }, [updateCard]);

  return (
    <Card className="border-border-subtle bg-bg-surface-2 h-full py-0">
      <CardContent className="p-3 h-full flex flex-col">
        {/* Header - not clickable, each bill opens its own card */}
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <CreditCard className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-text-primary text-sm">Bills</h3>
            <p className="text-xs text-text-muted">
              {formatAmount(monthlyTotal)}/month
            </p>
          </div>
        </div>

        {/* Bills List */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-text-muted">Loading...</p>
          </div>
        ) : subscriptions.length > 0 ? (
          <div className="flex-1 space-y-2 overflow-y-auto">
            <BillSection
              title="Due This Week"
              bills={grouped.dueThisWeek}
              paidCardIds={paidCardIds}
              onTogglePaid={handleTogglePaid}
              onCardClick={openCardDetail}
            />
            <BillSection
              title="Later This Month"
              bills={grouped.laterThisMonth}
              paidCardIds={paidCardIds}
              onTogglePaid={handleTogglePaid}
              onCardClick={openCardDetail}
            />
            <BillSection
              title="Paid"
              bills={grouped.paid}
              paidCardIds={paidCardIds}
              onTogglePaid={handleTogglePaid}
              onCardClick={openCardDetail}
            />

            {/* Progress footer */}
            <div className="pt-2 border-t border-border-subtle">
              <p className="text-xs text-text-muted text-center">
                {paidCount} of {totalCount} paid
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <CreditCard className="h-8 w-8 text-text-muted/50 mb-2" />
            <p className="text-sm text-text-muted">No subscriptions</p>
            <p className="text-xs text-text-muted/70 mt-1">
              Add #subscription to cards to track bills
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
