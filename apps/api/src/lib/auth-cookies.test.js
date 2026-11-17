import { describe, expect, it, jest } from "@jest/globals";
import { ACCESS_COOKIE, clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from "./auth-cookies.js";

const mockRes = () => ({ cookie: jest.fn(), clearCookie: jest.fn() });

describe("cookie names", () => {
  it("are access_token and refresh_token", () => {
    expect(ACCESS_COOKIE).toBe("access_token");
    expect(REFRESH_COOKIE).toBe("refresh_token");
  });
});

describe("setAuthCookies", () => {
  it("sets both tokens as httpOnly, SameSite=Lax cookies scoped to their paths", () => {
    const res = mockRes();
    setAuthCookies(res, { accessToken: "aaa", refreshToken: "rrr" });

    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.cookie).toHaveBeenCalledWith("access_token", "aaa", {
      httpOnly: true,
      sameSite: "lax",
      // NODE_ENV is "test", so not Secure (Secure is production only)
      secure: false,
      path: "/api",
      maxAge: 15 * 60 * 1000,
    });
    expect(res.cookie).toHaveBeenCalledWith("refresh_token", "rrr", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/api/auth",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  });
});

describe("clearAuthCookies", () => {
  it("clears both cookies with the same path they were set with", () => {
    const res = mockRes();
    clearAuthCookies(res);

    expect(res.clearCookie).toHaveBeenCalledTimes(2);
    // A browser only clears a cookie when the path matches the one it was set with.
    expect(res.clearCookie).toHaveBeenCalledWith(
      "access_token",
      expect.objectContaining({ path: "/api", httpOnly: true }),
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      "refresh_token",
      expect.objectContaining({ path: "/api/auth", httpOnly: true }),
    );
    for (const [, options] of res.clearCookie.mock.calls) {
      expect(options).not.toHaveProperty("maxAge");
    }
  });
});
