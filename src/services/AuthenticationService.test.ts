import AuthenticationService from "./AuthenticationService";

describe("AuthenticationService", () => {
  let authService: AuthenticationService;

  beforeEach(() => {
    authService = new AuthenticationService();
  });

  describe("registerUser", () => {
    it("should register a new user and return user data", () => {
      const user = authService.registerUser({ email: "test@example.com", password: "Secret123" });

      expect(user.id).toBeDefined();
      expect(user.email).toBe("test@example.com");
      expect(user.passwordHash).toBeDefined();
      expect(user.salt).toBeDefined();
      expect(user.passwordHash).not.toBe("Secret123");
    });

    it("should throw on duplicate email registration", () => {
      authService.registerUser({ email: "test@example.com", password: "Secret123" });

      expect(() => {
        authService.registerUser({ email: "test@example.com", password: "Other456" });
      }).toThrow("Email already registered");
    });
  });

  describe("login", () => {
    it("should return token on valid credentials", () => {
      authService.registerUser({ email: "test@example.com", password: "Secret123" });

      const result = authService.login("test@example.com", "Secret123");

      expect(result).not.toBeNull();
      expect(result!.user.email).toBe("test@example.com");
      expect(result!.token).toBeDefined();
    });

    it("should return null on wrong password", () => {
      authService.registerUser({ email: "test@example.com", password: "Secret123" });

      const result = authService.login("test@example.com", "WrongPassword");

      expect(result).toBeNull();
    });

    it("should return null on unknown email", () => {
      const result = authService.login("unknown@example.com", "Secret123");

      expect(result).toBeNull();
    });
  });

  describe("generateToken", () => {
    it("should produce a JWT string", () => {
      const token = authService.generateToken({ id: "abc-123", email: "test@example.com" });

      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });
  });
});
