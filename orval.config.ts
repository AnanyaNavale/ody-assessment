import { defineConfig } from "orval";

function toPascalCase(value: string): string {
  return value
    .split(/[-_/{}]/g)
    .filter((part) => part.length > 0 && part !== "api")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function singularize(name: string): string {
  if (name.endsWith("ies")) {
    return `${name.slice(0, -3)}y`;
  }

  if (name.endsWith("s") && !name.endsWith("ss")) {
    return name.slice(0, -1);
  }

  return name;
}

function hasPathParam(operation: {
  parameters?: Array<{ in?: string } | { $ref: string }>;
}): boolean {
  return (operation.parameters ?? []).some(
    (parameter) => "in" in parameter && parameter.in === "path",
  );
}

function operationName(
  operation: { summary?: string; parameters?: Array<{ in?: string } | { $ref: string }> },
  route: string,
  verb: string,
): string {
  const resource = toPascalCase(
    route
      .replace(/\$\{[^}]+\}/g, "")
      .replace(/\{[^}]+\}/g, "")
      .replace(/:[^/]+/g, ""),
  );
  const singular = singularize(resource);
  const summary = operation.summary ?? "";
  const isById =
    hasPathParam(operation) ||
    /\$\{[^}]+\}/.test(route) ||
    /\{[^}]+\}/.test(route) ||
    /:[A-Za-z_][\w]*/.test(route);

  if (/^list/i.test(summary)) {
    return `get${resource}`;
  }
  if (/^get/i.test(summary)) {
    return `get${singular}`;
  }
  if (/^create/i.test(summary)) {
    return `create${singular}`;
  }
  if (/^update/i.test(summary)) {
    return `update${singular}`;
  }
  if (/^delete/i.test(summary)) {
    return `delete${singular}`;
  }

  switch (verb) {
    case "get":
      return isById ? `get${singular}` : `get${resource}`;
    case "post":
      return `create${singular}`;
    case "put":
    case "patch":
      return `update${singular}`;
    case "delete":
      return `delete${singular}`;
    default:
      return `${verb}${resource}`;
  }
}

export default defineConfig({
  ody: {
    input: {
      target: "http://localhost:8787/api/openapi.json",
    },
    output: {
      mode: "split",
      client: "react-query",
      httpClient: "axios",
      target: "./packages/api-client/src/generated/endpoints.ts",
      schemas: "./packages/api-client/src/generated/model",
      clean: true,
      override: {
        operationName,
        mutator: {
          path: "./packages/api-client/src/http-client.ts",
          name: "httpClient",
        },
        query: {
          useQuery: true,
          useMutation: true,
          signal: true,
        },
      },
    },
  },
});
