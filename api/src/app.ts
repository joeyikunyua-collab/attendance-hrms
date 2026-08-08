import express from "express";
import cookieParser from "cookie-parser";
import routes from "./routes";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
