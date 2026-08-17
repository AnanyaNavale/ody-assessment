/// <reference types="node" />
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import app, { openAPIConfig } from "./index";

const backendRoot = fileURLToPath(new URL("..", import.meta.url).href);
const outputPath = path.join(
  backendRoot,
  "../../packages/api-client/openapi.json",
);

const spec = app.getOpenAPIDocument(openAPIConfig);

writeFileSync(outputPath, `${JSON.stringify(spec, null, 2)}\n`);

console.log("OpenAPI spec written to packages/api-client/openapi.json");
