import { config } from "./config.js";
import { migrate, openDb } from "./db/index.js";
import { createRepo } from "./db/repo.js";
import { allSources, ingest } from "./sources/index.js";

const db = await openDb(config);
await migrate(db);
console.log(await ingest(createRepo(db), allSources()));
await db.close();
