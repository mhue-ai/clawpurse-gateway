import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

class AuthenticationMiddleware {
  private static JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

  static validateToken(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication token missing' });
    }

    try {
      const decoded = jwt.verify(token, AuthenticationMiddleware.JWT_SECRET);
      
      // Attach user information to request
      (req as any).user = decoded;
      next();
    } catch (error) {
      res.status(403).json({ error: 'Invalid or expired token' });
    }
  }

  static checkPermissions(requiredScopes: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const hasRequiredScopes = requiredScopes.every(scope => 
        user.scopes?.includes(scope)
      );

      if (!hasRequiredScopes) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    };
  }

  static multiFactorAuthCheck() {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;

      if (!user.mfaVerified) {
        return res.status(403).json({ error: 'Multi-factor authentication required' });
      }

      next();
    };
  }
}

export default AuthenticationMiddleware;
