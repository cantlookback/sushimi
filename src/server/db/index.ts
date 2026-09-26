import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { getDatabaseConnectionString } from "./connection";

let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDatabase() {
  if (database) return database;
  const connectionString = getDatabaseConnectionString();
  const client = postgres(connectionString, { max: 10 });
  database = drizzle(client, { schema });
  return database;
}
