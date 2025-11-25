/**
 * Shared types for Pawkit Web Clipper extension
 */

export interface CardPayload {
  title: string
  url: string
  notes?: string
  collections?: string[]
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

export interface SetTokenMessage {
  type: 'SET_TOKEN'
  token: string
}

export interface GetTokenMessage {
  type: 'GET_TOKEN'
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

export interface Collection {
  id: string
  name: string
  emoji: string | null
  slug: string
}

export interface GetCollectionsResponse {
  ok: boolean
  data?: Collection[]
  error?: string
}

export type Message = SaveCardMessage | SetTokenMessage | GetTokenMessage | StartImagePickerMessage | ImageSelectedMessage | ImagePickerCancelledMessage | ReopenPopupMessage | GetCollectionsMessage

export interface SaveCardResponse {
  ok: boolean
  data?: {
    id: string
    title: string
    url: string
    [key: string]: unknown
  }
  error?: string
}

export interface GetTokenResponse {
  ok: boolean
  token?: string
}
