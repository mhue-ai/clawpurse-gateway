import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

class AuthenticationMiddleware {
  private static JWT_SECRET = process.env.JWT_SECRET || "change-me-before-production";

  static validateToken(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      res.status(401).json({ error: "Authentication token missing" });
      return;
    }

    try {
      const decoded = jwt.verify(token, AuthenticationMiddleware.JWT_SECRET);
      (req as any).user = decoded;
      next();
    } catch (error) {
      res.status(403).json({ error: "Invalid or expired token" });
    }
  }
}

export default AuthenticationMiddleware;
