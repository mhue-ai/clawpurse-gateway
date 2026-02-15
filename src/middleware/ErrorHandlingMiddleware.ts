import { Request, Response, NextFunction } from 'express';

class ErrorHandlingMiddleware {
  // Central error handling middleware
  static handleError() {
    return (err: Error, req: Request, res: Response, next: NextFunction) => {
      // Log the error (in a real app, use a proper logging service)
      console.error('Unhandled Error:', err);

      // Determine error type and respond accordingly
      if (err instanceof ValidationError) {
        return res.status(400).json({
          error: 'Validation Failed',
          details: err.details
        });
      }

      if (err instanceof AuthorizationError) {
        return res.status(403).json({
          error: 'Authorization Failed',
          message: err.message
        });
      }

      // Generic server error for unhandled exceptions
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      });
    };
  }

  // Async error wrapper to catch errors in async route handlers
  static asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Not Found handler
  static notFoundHandler(req: Request, res: Response, next: NextFunction) {
    res.status(404).json({
      error: 'Not Found',
      message: 
    });
  }
}

// Custom error classes
class ValidationError extends Error {
  details: any;

  constructor(details: any) {
    super('Validation Error');
    this.details = details;
  }
}

class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export {
  ErrorHandlingMiddleware,
  ValidationError,
  AuthorizationError
};
