import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolvers } from "./resolvers.js";
import { buildContext } from "./auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const typeDefs = fs.readFileSync(
  path.join(__dirname, "schema.graphql"),
  "utf8"
);

const server = new ApolloServer({ typeDefs, resolvers });
const port = process.env.PORT || 4000;

const { url } = await startStandaloneServer(server, {
  listen: { port },
  context: async ({ req }) => buildContext(req)
});

console.log("[graphql-bff] escuchando en " + url);
