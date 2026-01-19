/**
 * Proxy-aware fetch utility for Hugo binary downloads.
 *
 * Automatically uses HTTP_PROXY, HTTPS_PROXY, and NO_PROXY environment
 * variables when making network requests during installation.
 *
 * @module
 */

import type { RequestInit, Response } from "undici";
import { EnvHttpProxyAgent, fetch as undiciFetch } from "undici";
import { logger } from "./utils";

/**
 * Shared proxy agent that reads HTTP_PROXY, HTTPS_PROXY, NO_PROXY from env.
 * The agent handles both lowercase and uppercase variants, with lowercase
 * taking precedence.
 */
const proxyAgent = new EnvHttpProxyAgent();

/**
 * Track whether we've already logged the proxy message to avoid spam.
 */
let hasLoggedProxy = false;

/**
 * Gets the proxy URL from environment variables, if configured.
 *
 * Checks both uppercase and lowercase variants, with lowercase taking
 * precedence (matching undici's behavior).
 *
 * @returns The proxy URL if configured, undefined otherwise
 */
export function getProxyUrl(): string | undefined {
  return (
    process.env.https_proxy ||
    process.env.HTTPS_PROXY ||
    process.env.http_proxy ||
    process.env.HTTP_PROXY
  );
}

/**
 * Proxy-aware fetch that automatically uses HTTP_PROXY/HTTPS_PROXY env vars.
 *
 * This is a drop-in replacement for native fetch() that routes requests
 * through a proxy server when the standard proxy environment variables
 * are set:
 *
 * - `HTTP_PROXY` / `http_proxy` - Proxy for HTTP requests
 * - `HTTPS_PROXY` / `https_proxy` - Proxy for HTTPS requests
 * - `NO_PROXY` / `no_proxy` - Comma-separated list of hosts to bypass
 *
 * @param url - The URL to fetch
 * @param init - Optional fetch init options (same as native fetch)
 * @returns A Promise that resolves to the Response
 *
 * @example
 * ```typescript
 * // With HTTPS_PROXY=http://proxy.example.com:8080
 * const response = await proxyFetch('https://github.com/...');
 * // Request is routed through the proxy
 * ```
 */
export async function proxyFetch(
  url: string | URL,
  init?: RequestInit,
): Promise<Response> {
  // Log proxy usage once per installation (respects HUGO_QUIET)
  if (!hasLoggedProxy) {
    const proxyUrl = getProxyUrl();
    if (proxyUrl) {
      logger.info(`Using proxy: ${proxyUrl}`);
    }
    hasLoggedProxy = true;
  }

  return undiciFetch(url, {
    ...init,
    dispatcher: proxyAgent,
  });
}
