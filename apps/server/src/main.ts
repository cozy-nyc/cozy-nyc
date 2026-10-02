import { config } from "./config.js";
import { migrate, openDb } from "./db/index.js";
import { createRepo } from "./db/repo.js";
import { allSources, ingest } from "./sources/index.js";
import { buildApp } from "./app.js";

const db = await openDb(config);
await migrate(db);
const repo = createRepo(db);
const { app, presence } = await buildApp(repo);

const runIngest = async () => {
  app.log.info({ ingest: await ingest(repo, allSources()) }, "ingest finished");
  presence.broadcast({ t: "events-updated" });
};
await runIngest();
const timer = setInterval(runIngest, config.ingestIntervalMin * 60_000);
app.addHook("onClose", async () => {
  clearInterval(timer);
  await db.close();
});

await app.listen({ port: config.port, host: "0.0.0.0" });
