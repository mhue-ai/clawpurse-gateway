#!/usr/bin/env node
/**
 * Simple test upstream server.
 *
 * This is the API that gets protected behind the 402 gateway.
 * Run this on port 3000, then run the gateway on port 4020.
 */

const http = require("http");
const url = require("url");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  console.log(`[upstream] ${req.method} ${path} - ${new Date().toISOString()}`);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (path === "/api/test") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      message: "Access granted — this API call cost some NTMPI.",
      timestamp: new Date().toISOString(),
      path,
      method: req.method,
    }));
  } else if (path === "/api/data") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      data: [1, 2, 3, 4, 5],
      message: "Here is your protected data",
      cost: "0.001 NTMPI",
    }));
  } else if (path === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", service: "test-upstream" }));
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

server.listen(PORT, () => {
  console.log(`Test upstream server started on port ${PORT}`);
  console.log("Endpoints:");
  console.log("  GET  /api/test  - Simple test endpoint");
  console.log("  GET  /api/data  - Returns sample data");
  console.log("  GET  /health    - Health check");
  console.log("");
  console.log("Start the 402 gateway on port 4020 to protect this API");
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});
