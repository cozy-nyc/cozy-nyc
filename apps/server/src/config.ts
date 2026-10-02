export const config = {
  port: Number(process.env.PORT ?? 8787),
  databaseUrl: process.env.DATABASE_URL || null,
  pgliteDir: process.env.PGLITE_DIR ?? ".pglite",
  ticketmasterKey: process.env.TICKETMASTER_API_KEY || null,
  ingestIntervalMin: Number(process.env.INGEST_INTERVAL_MIN ?? 15),
};
