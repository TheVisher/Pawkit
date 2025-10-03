import { getOldCards } from "@/lib/server/cards";
import { listCollections } from "@/lib/server/collections";
import { DigUpView } from "@/components/dig-up/dig-up-view";

export default async function DigUpPage() {
  const [oldCardsResult, { flat: pawkits }] = await Promise.all([
    getOldCards(),
    listCollections()
  ]);

  if (!oldCardsResult) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-6xl mb-4">🐕</div>
        <h1 className="text-2xl font-semibold text-gray-100 mb-2">No Old Cards to Dig Up</h1>
        <p className="text-gray-400 text-center max-w-md">
          Kit couldn't find any cards older than 1 month. All your saved content is fresh!
        </p>
      </div>
    );
  }

  return (
    <DigUpView
      initialCards={oldCardsResult.cards}
      ageThreshold={oldCardsResult.ageThreshold}
      total={oldCardsResult.total}
      pawkits={pawkits}
    />
  );
}
