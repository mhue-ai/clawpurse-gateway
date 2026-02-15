import { Request, Response, NextFunction } from "express";
import winston from "winston";

class LoggingMiddleware {
  private static logger: winston.Logger;

  static initialize(): void {
    this.logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [
        new winston.transports.Console({ format: winston.format.simple() }),
        new winston.transports.File({ filename: "error.log", level: "error" }),
        new winston.transports.File({ filename: "combined.log" }),
      ],
    });
  }

  static requestLogger(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();

    this.logger.info("Incoming request", {
      method: req.method,
      url: req.url,
      query: req.query,
    });

    res.on("finish", () => {
      const duration = Date.now() - start;
      this.logger.info("Request completed", {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
      });
    });

    next();
  }
}

LoggingMiddleware.initialize();

export default LoggingMiddleware;
