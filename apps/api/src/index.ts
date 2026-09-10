import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { config } from "./config.js";
import { documentsRouter } from "./routes/documents.js";
import { factsRouter } from "./routes/facts.js";

const app = express();

app.use(cors());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/v1/documents", documentsRouter);
app.use("/v1/facts", factsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Express only treats this as error-handling middleware if it declares all four parameters.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
};
app.use(handleError);

app.listen(config.port, () => {
  console.log(`lumen api listening on port ${config.port}`);
});
