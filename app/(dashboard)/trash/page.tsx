import { getTrashCards, purgeOldTrashItems } from "@/lib/server/cards";
import { getTrashCollections } from "@/lib/server/collections";
import { TrashView } from "@/components/trash/trash-view";
import { requireUser } from "@/lib/auth/get-user";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function TrashPage() {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    // If auth fails, redirect to login
    redirect('/login');
  }

  // Auto-purge items older than 30 days (non-blocking - don't fail if this errors)
  try {
    await purgeOldTrashItems(user.id);
  } catch (purgeError) {
    // Continue even if purge fails
  }

  try {
    const [cards, pawkits] = await Promise.all([
      getTrashCards(user.id),
      getTrashCollections(user.id)
    ]);

    return <TrashView cards={cards} pawkits={pawkits} />;
  } catch (error) {
    // Return empty state on error instead of crashing
    return <TrashView cards={[]} pawkits={[]} />;
  }
}
