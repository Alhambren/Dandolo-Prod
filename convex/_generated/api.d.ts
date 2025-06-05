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
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as developers from "../developers.js";
import type * as http from "../http.js";
import type * as inference from "../inference.js";
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
  analytics: typeof analytics;
  auth: typeof auth;
  crons: typeof crons;
  developers: typeof developers;
  http: typeof http;
  inference: typeof inference;
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
