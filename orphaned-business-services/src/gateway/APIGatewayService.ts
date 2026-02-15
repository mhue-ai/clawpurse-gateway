
import express from "express";
import httpProxy from "http-proxy";

class APIGatewayService {
  private proxy: httpProxy;

  constructor() {
    this.proxy = httpProxy.createProxyServer();
  }

  createRoutingMiddleware() {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const services: Record<string, string> = {
        "/auth": "http://auth-service",
        "/wallet": "http://wallet-service",
        "/blockchain": "http://blockchain-service"
      };

      const matchedService = Object.keys(services).find(path => 
        req.path.startsWith(path)
      );

      if (matchedService) {
        this.proxy.web(req, res, { 
          target: services[matchedService],
          changeOrigin: true
        });
      } else {
        next();
      }
    };
  }
}

export default APIGatewayService;

