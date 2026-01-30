/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as cards from "../cards.js";
import type * as cleanup from "../cleanup.js";
import type * as collections from "../collections.js";
import type * as connectedAccounts from "../connectedAccounts.js";
import type * as connectedAccountsInternal from "../connectedAccountsInternal.js";
import type * as crons from "../crons.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as linkCheck from "../linkCheck.js";
import type * as metadata from "../metadata.js";
import type * as rateLimit from "../rateLimit.js";
import type * as references from "../references.js";
import type * as storage from "../storage.js";
import type * as todos from "../todos.js";
import type * as urlValidation from "../urlValidation.js";
import type * as users from "../users.js";
import type * as viewSettings from "../viewSettings.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  cards: typeof cards;
  cleanup: typeof cleanup;
  collections: typeof collections;
  connectedAccounts: typeof connectedAccounts;
  connectedAccountsInternal: typeof connectedAccountsInternal;
  crons: typeof crons;
  events: typeof events;
  http: typeof http;
  linkCheck: typeof linkCheck;
  metadata: typeof metadata;
  rateLimit: typeof rateLimit;
  references: typeof references;
  storage: typeof storage;
  todos: typeof todos;
  urlValidation: typeof urlValidation;
  users: typeof users;
  viewSettings: typeof viewSettings;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
