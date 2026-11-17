// Runs the Next CLI with the monorepo root .env loaded, listening on WEB_PORT.
// Next only reads .env files from apps/web, and it overwrites PORT with its own
// port, so the api's PORT is handed to next.config.js as API_PORT instead.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";

const rootEnv = new URL("../../../.env", import.meta.url);
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const [command, ...args] = process.argv.slice(2);
const port =
  command === "dev" || command === "start" ? ["--port", process.env.WEB_PORT ?? "5173"] : [];
const env = { ...process.env, API_PORT: process.env.PORT ?? "3000" };
const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");

const child = spawn(process.execPath, [nextBin, command, ...port, ...args], {
  stdio: "inherit",
  env,
});
child.on("exit", (code, signal) =>
  signal ? process.kill(process.pid, signal) : process.exit(code),
);
