/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as admin from "../admin.js";
import type * as analytics from "../analytics.js";
import type * as apiKeys from "../apiKeys.js";
import type * as crons from "../crons.js";
import type * as crypto from "../crypto.js";
import type * as cryptoActions from "../cryptoActions.js";
import type * as debug from "../debug.js";
import type * as debugPoints from "../debugPoints.js";
import type * as developers from "../developers.js";
import type * as inference from "../inference.js";
import type * as migrations from "../migrations.js";
import type * as models from "../models.js";
import type * as points from "../points.js";
import type * as providers from "../providers.js";
import type * as rateLimit from "../rateLimit.js";
import type * as router from "../router.js";
import type * as stats from "../stats.js";
import type * as wallets from "../wallets.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  analytics: typeof analytics;
  apiKeys: typeof apiKeys;
  crons: typeof crons;
  crypto: typeof crypto;
  cryptoActions: typeof cryptoActions;
  debug: typeof debug;
  debugPoints: typeof debugPoints;
  developers: typeof developers;
  inference: typeof inference;
  migrations: typeof migrations;
  models: typeof models;
  points: typeof points;
  providers: typeof providers;
  rateLimit: typeof rateLimit;
  router: typeof router;
  stats: typeof stats;
  wallets: typeof wallets;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
