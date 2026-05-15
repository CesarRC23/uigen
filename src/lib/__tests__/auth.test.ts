// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ set: mockCookieSet })),
}));

import { createSession } from "@/lib/auth";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("sets the auth-token cookie", async () => {
    await createSession("user-123", "test@example.com");

    expect(mockCookieSet).toHaveBeenCalledOnce();
    expect(mockCookieSet.mock.calls[0][0]).toBe("auth-token");
  });

  test("cookie value is a valid JWT containing userId and email", async () => {
    await createSession("user-123", "test@example.com");

    const token = mockCookieSet.mock.calls[0][1];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-123");
    expect(payload.email).toBe("test@example.com");
  });

  test("cookie expires in 7 days", async () => {
    const before = Date.now();
    await createSession("user-123", "test@example.com");
    const after = Date.now();

    const options = mockCookieSet.mock.calls[0][2];
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(options.expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 100);
    expect(options.expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 100);
  });

  test("cookie is HttpOnly with path /", async () => {
    await createSession("user-123", "test@example.com");

    const options = mockCookieSet.mock.calls[0][2];
    expect(options.httpOnly).toBe(true);
    expect(options.path).toBe("/");
  });

  test("cookie sameSite is lax", async () => {
    await createSession("user-123", "test@example.com");

    const options = mockCookieSet.mock.calls[0][2];
    expect(options.sameSite).toBe("lax");
  });

  test("cookie is not secure outside production", async () => {
    await createSession("user-123", "test@example.com");

    const options = mockCookieSet.mock.calls[0][2];
    expect(options.secure).toBe(false);
  });
});
