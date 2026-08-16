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

function operationName(_operation: unknown, route: string, verb: string): string {
  const isById = route.includes("{");
  const resource = toPascalCase(route.replace(/\{[^}]+\}/g, ""));
  const singular = singularize(resource);

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
