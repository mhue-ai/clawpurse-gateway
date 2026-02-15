import { Request, Response, NextFunction } from "express";

class ErrorHandlingMiddleware {
  static handleError() {
    return (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
      console.error("Unhandled Error:", err);

      if (err instanceof ValidationError) {
        res.status(400).json({ error: "Validation Failed", details: err.details });
        return;
      }

      if (err instanceof AuthorizationError) {
        res.status(403).json({ error: "Authorization Failed", message: err.message });
        return;
      }

      res.status(500).json({ error: "Internal Server Error", message: "An unexpected error occurred" });
    };
  }

  static asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  static notFoundHandler(_req: Request, res: Response): void {
    res.status(404).json({ error: "Not Found", message: "The requested resource does not exist" });
  }
}

class ValidationError extends Error {
  details: any;
  constructor(details: any) {
    super("Validation Error");
    this.details = details;
  }
}

class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export { ErrorHandlingMiddleware, ValidationError, AuthorizationError };
