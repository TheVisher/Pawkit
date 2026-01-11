/**
 * Shared types for Pawkit Web Clipper extension
 * V2: Simplified - uses cookie auth, no more extension tokens
 */

export interface Workspace {
  id: string
  name: string
  icon?: string | null
  isDefault: boolean
}

export interface CardPayload {
  title: string
  url: string
  notes?: string
  tags?: string[] // V2 uses tags instead of collections
  source?: 'webext'
  meta?: {
    ogImage?: string
    description?: string
    favicon?: string
  }
}

export interface SaveCardMessage {
  type: 'SAVE_CARD'
  payload: CardPayload
}

export interface CheckAuthMessage {
  type: 'CHECK_AUTH'
}

export interface StartImagePickerMessage {
  type: 'START_IMAGE_PICKER'
}

export interface ImageSelectedMessage {
  type: 'IMAGE_SELECTED'
  imageUrl: string
}

export interface ImagePickerCancelledMessage {
  type: 'IMAGE_PICKER_CANCELLED'
}

export interface ReopenPopupMessage {
  type: 'REOPEN_POPUP'
}

export interface GetCollectionsMessage {
  type: 'GET_COLLECTIONS'
}

export interface InitiateLoginMessage {
  type: 'INITIATE_LOGIN'
}

export interface LogoutMessage {
  type: 'LOGOUT'
}

export interface Collection {
  id: string
  name: string
  emoji: string | null
  slug: string
}

// API response type (server returns 'icon' instead of 'emoji')
export interface CollectionApiResponse {
  id: string
  name: string
  icon?: string | null
  slug?: string
}

export interface GetCollectionsResponse {
  ok: boolean
  data?: Collection[]
  error?: string
}

export type Message =
  | SaveCardMessage
  | CheckAuthMessage
  | StartImagePickerMessage
  | ImageSelectedMessage
  | ImagePickerCancelledMessage
  | ReopenPopupMessage
  | GetCollectionsMessage
  | InitiateLoginMessage
  | LogoutMessage

export interface SaveCardResponse {
  ok: boolean
  data?: {
    card: {
      id: string
      title: string
      url: string
      [key: string]: unknown
    }
  }
  error?: string
}

export interface CheckAuthResponse {
  ok: boolean
  error?: string
  user?: {
    email: string | null
  }
}
