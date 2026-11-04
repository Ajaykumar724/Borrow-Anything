import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import itemsRouter from "./routes/items.js";
import rentalsRouter from "./routes/rentals.js";
import usersRouter from "./routes/users.js";

const app = express();
const port = Number(process.env.PORT) || 4000;
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
  : true;

function log(event, details = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), event, ...details }));
}

app.use(cors({ origin: allowedOrigins }));
app.use((req, res, next) => {
  const requestId = req.get("x-request-id")?.slice(0, 100) || randomUUID();
  req.requestId = requestId;
  req.log = (event, details = {}) => log(event, { requestId, ...details });
  res.setHeader("x-request-id", requestId);
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 400 && body && typeof body === "object" && !Array.isArray(body)) {
      return json({ ...body, requestId: body.requestId || requestId });
    }
    return json(body);
  };
  const started = Date.now();
  res.on("finish", () => {
    const path = req.originalUrl.split("?")[0];
    if (res.statusCode === 400 || res.statusCode === 422) {
      req.log("http.validation_failed", { method: req.method, path, status: res.statusCode });
    }
    req.log("http.request", {
      method: req.method,
      path,
      status: res.statusCode,
      durationMs: Date.now() - started,
      ...(res.statusCode >= 400 ? { outcome: "request_error" } : {})
    });
  });
  next();
});
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "borrow-anything-api" }));
app.use("/api/items", itemsRouter);
app.use("/api/rentals", rentalsRouter);
app.use("/api/users", usersRouter);
app.use((req, res) => res.status(404).json({
  error: "Route not found",
  requestId: req.requestId
}));
app.use((error, req, res, _next) => {
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
  req.log?.("http.error", {
    status,
    errorType: error.type || error.name || "Error"
  });
  if (res.headersSent) return;
  res.status(status).json({
    error: status === 400 ? "Invalid request body" : status === 413 ? "Request body is too large" : "Unexpected server error",
    requestId: req.requestId
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => log("api.started", { port }));
}

export default app;
