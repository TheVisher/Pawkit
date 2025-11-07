// Re-export types from the web app's lib/types.ts
// This allows the mobile app to share the same type definitions

export type {
  CardModel,
  CardType,
  CardStatus,
  CollectionNode,
  UserModel,
} from '../../../lib/types';
