import { Hono } from "https://esm.sh/jsr/@hono/hono@4";
import { handle } from "https://esm.sh/jsr/@hono/hono/netlify";
import type { Context } from "https://edge.netlify.com/";

export type Env = {
  Bindings: {
    context: Context;
  };
};

const app = new Hono<Env>();

// Check for private IPs
function isPrivateIp(ip: string) {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.")
  );
}

// ASN/IP check middleware
app.use("*", async (c, next) => {
  const ip = c.env.context.ip; // Get the client IP using the Netlify's Context with c.env

  if (!ip) {
    return c.text(
      "We’re not live in your region yet, but stay tuned for future availability.",
      403
    );
  }

  // Allow private IPs
  if (isPrivateIp(ip)) {
    return await next();
  }

  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`); // Get the ASN number using ipapi.co
    if (!res.ok) {
      return c.text(
        "We’re not live in your region yet, but stay tuned for future availability.",
        403
      );
    }

    const { asn } = await res.json();
    const allowedASNs = ["AS13335", "AS812"]; // Cloudflare + Rogers
    if (!allowedASNs.includes(asn)) {
      return c.text(
        "We’re not live in your region yet, but stay tuned for future availability.",
        403
      );
    }

    await next();
  } catch {
    return c.text(
      "We’re not live in your region yet, but stay tuned for future availability.",
      403
    );
  }
});

// Root route
app.get("/", (c) => c.text("Hello Hono + Netlify Edge!"));

// Proxy route
app.get("/api", async (c) => {
  const origin = c.req.query("origin"); // use ?origin= to specify the file URL
  const id = c.req.query("id"); // use ?id= to specify the file ID

  // create origin URL depending on ?origin or ?id used
  let targetUrl: string | null = null;
  if (origin) {
    targetUrl = origin;
  } else if (id) {
    targetUrl = `https://pixeldrain.com/api/file/${id}?download`;
  }

  if (!targetUrl) {
    return c.json({ error: "Missing required parameter" }, { status: 400 });
  }
  const parsedUrl = new URL(targetUrl);
  const allowedHosts = [
    "pixeldrain.com",
    "pixeldra.in",
    "pixeldrain.net",
    "pixeldrain.dev",
  ];
  const isAllowedHost = allowedHosts.some(
    (host) =>
      parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`)
  );

  if (!isAllowedHost) {
    return c.json({ error: "Domain not allowed" }, { status: 403 });
  }

  const response = await fetch(targetUrl, { redirect: "follow" });
  if (!response.ok) {
    return new Response(JSON.stringify({ error: "Failed to fetch file" }), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contentType =
    response.headers.get("content-type") || "application/octet-stream";
  const contentDisposition =
    response.headers.get("content-disposition") ||
    `attachment; filename="${parsedUrl.pathname.split("/").pop()}"`;

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition,
    },
  });
});

// Check remaining limit
app.get("/limit", async (c) => {
  const res = await fetch("https://pixeldrain.com/api/misc/rate_limits");
  const data = await res.json();

  const percent = (
    (data.transfer_limit_used / data.transfer_limit) *
    100
  ).toFixed(2);
  const limitMB = (data.transfer_limit / 1e6).toFixed(2);
  const usedMB = (data.transfer_limit_used / 1e6).toFixed(2);

  return c.json({
    page: "Rate Limit Page",
    transfer_limit_used_percentage: `${percent}%`,
    transfer_limit: `${limitMB} MB`,
    transfer_limit_used: `${usedMB} MB`,
  });
});

export default handle(app);
