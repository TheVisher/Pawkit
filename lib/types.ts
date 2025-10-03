export type CardStatus = "PENDING" | "READY" | "ERROR";

export type CardModel = {
  id: string;
  url: string;
  title?: string | null;
  notes?: string | null;
  status: CardStatus;
  tags: string[];
  collections: string[];
  domain?: string | null;
  image?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  articleContent?: string | null;
  pinned?: boolean;
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
