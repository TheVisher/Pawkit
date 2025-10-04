export type CardStatus = "PENDING" | "READY" | "ERROR";
export type CardType = "url" | "md-note" | "text-note";

export type OldCardAgeThreshold = "1 day" | "12 hours" | "6 hours" | "1 hour";

export type CardModel = {
  id: string;
  type: CardType;
  url: string;
  title: string | null;
  notes: string | null;
  content: string | null;
  status: CardStatus;
  tags: string[];
  collections: string[];
  domain: string | null;
  image: string | null;
  description: string | null;
  metadata: Record<string, unknown> | undefined;
  articleContent: string | null;
  pinned: boolean;
  deleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CollectionNode = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  children: CollectionNode[];
};
