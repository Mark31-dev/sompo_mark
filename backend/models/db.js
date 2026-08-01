import { fileDriver } from "./drivers/fileDriver.js";
import { createMysqlDriver } from "./drivers/mysqlDriver.js";

let driver = null;

/**
 * MySQL when DB_HOST is configured, otherwise a JSON file store so the API
 * runs with zero setup. Both expose the same table operations.
 */
export async function connect() {
  if (driver) return driver;

  if (process.env.DB_HOST) {
    driver = createMysqlDriver({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "sompo_team",
    });
  } else {
    driver = fileDriver;
  }

  await driver.init();
  return driver;
}

export function db() {
  if (!driver) throw new Error("Database not connected — call connect() first");
  return driver;
}

export const driverKind = () => (driver ? driver.kind : "none");
