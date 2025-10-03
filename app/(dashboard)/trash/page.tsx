import { getTrashCards, purgeOldTrashItems } from "@/lib/server/cards";
import { getTrashCollections } from "@/lib/server/collections";
import { TrashView } from "@/components/trash/trash-view";

export default async function TrashPage() {
  // Auto-purge items older than 30 days
  await purgeOldTrashItems();

  const [cards, pawkits] = await Promise.all([
    getTrashCards(),
    getTrashCollections()
  ]);

  return <TrashView cards={cards} pawkits={pawkits} />;
}
