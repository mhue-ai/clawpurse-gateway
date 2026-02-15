import { Request, Response, NextFunction } from 'express';
import winston from 'winston';

class LoggingMiddleware {
  private static logger: winston.Logger;

  static initialize() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        // Console logging
        new winston.transports.Console({
          format: winston.format.simple()
        }),
        // File logging
        new winston.transports.File({ 
          filename: 'error.log', 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: 'combined.log' 
        })
      ]
    });
  }

  static requestLogger(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    // Log the request
    this.logger.info(, {
      method: req.method,
      url: req.url,
      body: req.body,
      query: req.query,
      headers: req.headers
    });

    // Attach logging to response
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      this.logger.info(, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration
      });
    });

    next();
  }

  static errorLogger() {
    return (err: Error, req: Request, res: Response, next: NextFunction) => {
      this.logger.error('Unhandled Error', {
        message: err.message,
        stack: err.stack,
        method: req.method,
        url: req.url
      });

      // Default error response
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
      });
    };
  }
}

// Initialize logging
LoggingMiddleware.initialize();

export default LoggingMiddleware;
