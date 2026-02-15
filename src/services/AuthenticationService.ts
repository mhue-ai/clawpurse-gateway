
import crypto from "crypto";
import jwt from "jsonwebtoken";

class AuthenticationService {
  private static JWT_SECRET = process.env.JWT_SECRET || "default_secret";

  registerUser(userData: {
    email: string;
    password: string;
  }) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(userData.password, salt, 1000, 64, "sha512").toString("hex");

    return {
      id: crypto.randomUUID(),
      email: userData.email,
      passwordHash: hash,
      salt
    };
  }

  generateToken(user: {
    id: string;
    email: string;
  }) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email
      },
      AuthenticationService.JWT_SECRET,
      { expiresIn: "1h" }
    );
  }
}

export default AuthenticationService;

