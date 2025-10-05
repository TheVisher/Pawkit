/**
 * Shared types for Pawkit Web Clipper extension
 */

export interface CardPayload {
  title: string
  url: string
  notes?: string
  collectionId?: string | null
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

export type Message = SaveCardMessage | SetTokenMessage | GetTokenMessage

export interface SaveCardResponse {
  ok: boolean
  data?: {
    id: string
    title: string
    url: string
    [key: string]: any
  }
  error?: string
}

export interface GetTokenResponse {
  ok: boolean
  token?: string
}
