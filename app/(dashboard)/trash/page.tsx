import { getTrashCards, purgeOldTrashItems } from "@/lib/server/cards";
import { getTrashCollections } from "@/lib/server/collections";
import { TrashView } from "@/components/trash/trash-view";
import { requireUser } from "@/lib/auth/get-user";

export default async function TrashPage() {
  const user = await requireUser();

  // Auto-purge items older than 30 days
  await purgeOldTrashItems(user.id);

  const [cards, pawkits] = await Promise.all([
    getTrashCards(user.id),
    getTrashCollections(user.id)
  ]);

  return <TrashView cards={cards} pawkits={pawkits} />;
}
