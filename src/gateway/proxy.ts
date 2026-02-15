/**
 * Reverse proxy — forwards verified requests to the upstream service.
 */

import { Request, Response } from "express";

const FORWARDED_HEADERS = [
  "content-type", "accept", "authorization", "user-agent",
  "accept-encoding", "accept-language",
];

/**
 * Proxy the inbound request to the upstream URL, preserving
 * method, path, headers, and body.
 */
export async function proxyRequest(
  req: Request,
  res: Response,
  upstream: string
): Promise<void> {
  try {
    const upstreamUrl = `${upstream}${req.originalUrl}`;
    const headers: Record<string, string> = {};

    for (const key of FORWARDED_HEADERS) {
      const val = req.headers[key];
      if (typeof val === "string") headers[key] = val;
    }
    // Tell upstream the original client IP
    headers["x-forwarded-for"] = req.ip ?? req.socket.remoteAddress ?? "unknown";

    const init: RequestInit = { method: req.method, headers };
    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = JSON.stringify(req.body);
      headers["content-type"] = headers["content-type"] ?? "application/json";
    }

    const upstreamRes = await fetch(upstreamUrl, init);
    const body = await upstreamRes.text();

    // Forward status and selected response headers
    res.status(upstreamRes.status);
    const ct = upstreamRes.headers.get("content-type");
    if (ct) res.setHeader("content-type", ct);
    res.send(body);
  } catch (err) {
    console.error("[proxy] Upstream error:", err);
    res.status(502).json({ error: "Upstream unavailable", code: "BAD_GATEWAY" });
  }
}
