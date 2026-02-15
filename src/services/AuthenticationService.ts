import crypto from "crypto";
import jwt from "jsonwebtoken";

class AuthenticationService {
  private static JWT_SECRET = process.env.JWT_SECRET || "change-me-before-production";
  private static PBKDF2_ITERATIONS = 100000;

  private users: Map<string, RegisteredUser> = new Map();

  registerUser(userData: { email: string; password: string }): RegisteredUser {
    if (this.users.has(userData.email)) {
      throw new Error("Email already registered");
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .pbkdf2Sync(userData.password, salt, AuthenticationService.PBKDF2_ITERATIONS, 64, "sha512")
      .toString("hex");

    const user: RegisteredUser = {
      id: crypto.randomUUID(),
      email: userData.email,
      passwordHash: hash,
      salt,
    };

    this.users.set(user.email, user);
    return user;
  }

  login(email: string, password: string): { user: { id: string; email: string }; token: string } | null {
    const user = this.users.get(email);
    if (!user) return null;

    const hash = crypto
      .pbkdf2Sync(password, user.salt, AuthenticationService.PBKDF2_ITERATIONS, 64, "sha512")
      .toString("hex");

    if (hash !== user.passwordHash) return null;

    const token = this.generateToken({ id: user.id, email: user.email });
    return { user: { id: user.id, email: user.email }, token };
  }

  generateToken(user: { id: string; email: string }): string {
    return jwt.sign(
      { userId: user.id, email: user.email },
      AuthenticationService.JWT_SECRET,
      { expiresIn: "1h" }
    );
  }
}

interface RegisteredUser {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
}

export default AuthenticationService;
