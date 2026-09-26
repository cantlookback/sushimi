type DatabaseEnvironment = NodeJS.ProcessEnv;

export function getDatabaseConnectionString(
  environment: DatabaseEnvironment = process.env,
) {
  if (environment.DATABASE_URL) return environment.DATABASE_URL;

  const password = environment.POSTGRES_PASSWORD;
  if (!password) {
    throw new Error(
      "DATABASE_URL or POSTGRES_PASSWORD must be configured",
    );
  }

  const url = new URL("postgresql://localhost");
  url.hostname = environment.POSTGRES_HOST ?? "localhost";
  url.port = environment.POSTGRES_PORT ?? "5432";
  url.username = environment.POSTGRES_USER ?? "sushimi";
  url.password = password;
  url.pathname = `/${environment.POSTGRES_DB ?? "sushimi"}`;

  return url.toString();
}
