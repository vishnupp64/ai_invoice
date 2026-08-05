import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import authRoutes from "./routes/authRoutes";
import invoiceRoutes from "./routes/invoiceRoutes";
import meRoutes from "./routes/meRoutes";
import { errorHandler } from "./middlewares/errorHandler";
import { HttpError } from "./utils/httpError";

const app = express();

app.use(helmet());
app.use(cors({ origin: true }));
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/me", meRoutes);
app.use("/api/invoices", invoiceRoutes);

app.use((_req, _res, next) => {
  next(new HttpError(404, "Not found"));
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

