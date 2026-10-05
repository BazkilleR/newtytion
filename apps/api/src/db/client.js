import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../env.js";
import * as schema from "./schema/index.js";

export const pool = new Pool({ connectionString: env.DATABASE_URL });

// casing: "snake_case" maps `proteinG` in JS to `protein_g` in SQL automatically.
export const db = drizzle(pool, { schema, casing: "snake_case" });
