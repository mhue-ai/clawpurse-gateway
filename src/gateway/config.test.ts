import { loadConfig } from "./config";

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should return defaults when no env vars are set", () => {
    const config = loadConfig();
    expect(config.port).toBe(4020);
    expect(config.upstream).toBe("http://localhost:3000");
    expect(config.restEndpoint).toBe("https://api2.neutaro.io");
    expect(config.defaultPrice).toBe("0.001");
    expect(config.prepaidEnabled).toBe(false);
    expect(config.invoiceTtlSeconds).toBe(300);
    expect(config.minConfirmations).toBe(1);
    expect(config.routes).toEqual([]);
  });

  it("should read env vars", () => {
    process.env.PORT = "8080";
    process.env.GATEWAY_UPSTREAM = "http://myapi:5000";
    process.env.GATEWAY_PAYMENT_ADDRESS = "neutaro1abc";
    process.env.GATEWAY_DEFAULT_PRICE = "0.05";
    process.env.GATEWAY_PREPAID = "true";

    const config = loadConfig();
    expect(config.port).toBe(8080);
    expect(config.upstream).toBe("http://myapi:5000");
    expect(config.paymentAddress).toBe("neutaro1abc");
    expect(config.defaultPrice).toBe("0.05");
    expect(config.prepaidEnabled).toBe(true);
  });

  it("should parse GATEWAY_ROUTES", () => {
    process.env.GATEWAY_ROUTES = "/api/expensive/*=1.0,/api/cheap/*=0.0001";

    const config = loadConfig();
    expect(config.routes).toEqual([
      { pattern: "/api/expensive/*", amount: "1.0" },
      { pattern: "/api/cheap/*", amount: "0.0001" },
    ]);
  });
});
