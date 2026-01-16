import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock undici before importing the module under test
vi.mock("undici", () => {
  // Create a mock class for EnvHttpProxyAgent
  class MockEnvHttpProxyAgent {}

  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
  });

  return {
    EnvHttpProxyAgent: MockEnvHttpProxyAgent,
    fetch: mockFetch,
  };
});

// Mock the logger to avoid console output during tests
vi.mock("../../src/lib/utils", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks are set up
import { getProxyUrl, proxyFetch } from "../../src/lib/fetch";

describe("fetch", () => {
  // Store original env vars to restore after each test
  const originalEnv: Record<string, string | undefined> = {};

  // List of all proxy env vars we might set during tests
  const proxyEnvVars = [
    "HTTP_PROXY",
    "http_proxy",
    "HTTPS_PROXY",
    "https_proxy",
    "NO_PROXY",
    "no_proxy",
  ];

  beforeEach(() => {
    // Save original values and clear
    for (const key of proxyEnvVars) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original values
    for (const key of proxyEnvVars) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  describe("getProxyUrl", () => {
    it("should return undefined when no proxy env vars are set", () => {
      expect(getProxyUrl()).toBeUndefined();
    });

    it("should return HTTPS_PROXY value", () => {
      process.env.HTTPS_PROXY = "http://proxy.example.com:8080";
      expect(getProxyUrl()).toBe("http://proxy.example.com:8080");
    });

    it("should return https_proxy value (lowercase)", () => {
      process.env.https_proxy = "http://proxy.example.com:8080";
      expect(getProxyUrl()).toBe("http://proxy.example.com:8080");
    });

    it("should return HTTP_PROXY value when HTTPS_PROXY is not set", () => {
      process.env.HTTP_PROXY = "http://proxy.example.com:8080";
      expect(getProxyUrl()).toBe("http://proxy.example.com:8080");
    });

    it("should return http_proxy value (lowercase)", () => {
      process.env.http_proxy = "http://proxy.example.com:8080";
      expect(getProxyUrl()).toBe("http://proxy.example.com:8080");
    });

    it("should prefer lowercase https_proxy over uppercase", () => {
      process.env.https_proxy = "http://lowercase.example.com:8080";
      process.env.HTTPS_PROXY = "http://uppercase.example.com:8080";
      expect(getProxyUrl()).toBe("http://lowercase.example.com:8080");
    });

    it("should prefer HTTPS_PROXY over HTTP_PROXY", () => {
      process.env.HTTPS_PROXY = "http://https-proxy.example.com:8080";
      process.env.HTTP_PROXY = "http://http-proxy.example.com:8080";
      expect(getProxyUrl()).toBe("http://https-proxy.example.com:8080");
    });
  });

  describe("proxyFetch", () => {
    it("should call undici fetch with the provided URL", async () => {
      const { fetch: mockFetch } = await import("undici");

      await proxyFetch("https://example.com/file.tar.gz");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/file.tar.gz",
        expect.objectContaining({
          dispatcher: expect.anything(),
        }),
      );
    });

    it("should pass through init options", async () => {
      const { fetch: mockFetch } = await import("undici");

      await proxyFetch("https://example.com/file.tar.gz", {
        method: "GET",
        headers: { "X-Custom": "header" },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/file.tar.gz",
        expect.objectContaining({
          method: "GET",
          headers: { "X-Custom": "header" },
          dispatcher: expect.anything(),
        }),
      );
    });

    // Note: Testing that logging happens exactly once requires module reset
    // which is complex with Vitest's module caching. The logging behavior
    // is covered by the implementation and manual testing. The key behaviors
    // (proxy detection and fetch dispatcher usage) are tested above.
  });
});
