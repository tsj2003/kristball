import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config/env";
import { authRouter } from "./routes/auth";
import { referenceRouter } from "./routes/reference";
import { dashboardRouter } from "./routes/dashboard";
import { purchasesRouter } from "./routes/purchases";
import { transfersRouter } from "./routes/transfers";
import { assignmentsRouter } from "./routes/assignments";
import { auditRouter } from "./routes/audit";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { loggerMiddleware } from "./middleware/logger";

export const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: config.corsOrigin === "*"
      ? true
      : config.corsOrigin.split(",").map((item) => item.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(loggerMiddleware);

function health(_req: express.Request, res: express.Response) {
  res.json({ status: "ok", service: "kristallball-api" });
}

app.get("/", health);
app.get("/health", health);
app.get("/api/health", health);

app.use("/api/auth", authRouter);
app.use("/api", referenceRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/purchases", purchasesRouter);
app.use("/api/transfers", transfersRouter);
app.use("/api/assignments", assignmentsRouter);
app.use("/api/audit-logs", auditRouter);

app.use(notFound);
app.use(errorHandler);
