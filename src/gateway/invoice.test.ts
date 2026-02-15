import { matchRoute } from "./invoice";
import { RoutePrice } from "./config";

describe("matchRoute", () => {
  const routes: RoutePrice[] = [
    { pattern: "/api/expensive/*", amount: "1.0" },
    { pattern: "/api/cheap/*", amount: "0.0001" },
    { pattern: "/api/v2/data", amount: "0.5" },
  ];
  const defaultPrice = "0.001";

  it("should match an exact route", () => {
    expect(matchRoute("/api/v2/data", routes, defaultPrice)).toBe("0.5");
  });

  it("should match a glob pattern", () => {
    expect(matchRoute("/api/expensive/something", routes, defaultPrice)).toBe("1.0");
    expect(matchRoute("/api/cheap/anything/here", routes, defaultPrice)).toBe("0.0001");
  });

  it("should return default price for unmatched routes", () => {
    expect(matchRoute("/unknown/path", routes, defaultPrice)).toBe(defaultPrice);
  });

  it("should return default price when no routes are defined", () => {
    expect(matchRoute("/api/test", [], defaultPrice)).toBe(defaultPrice);
  });

  it("should match first matching route", () => {
    const overlapping: RoutePrice[] = [
      { pattern: "/api/*", amount: "0.01" },
      { pattern: "/api/expensive/*", amount: "1.0" },
    ];
    expect(matchRoute("/api/expensive/thing", overlapping, defaultPrice)).toBe("0.01");
  });
});
