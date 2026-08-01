import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data");
const FILE = path.join(DIR, "store.json");

const EMPTY = {
  activation_codes: [],
  users: [],
  rooms: [],
  room_members: [],
  messages: [],
};

let cache = null;
let writeQueued = false;

function load() {
  if (cache) return cache;

  try {
    cache = { ...EMPTY, ...JSON.parse(fs.readFileSync(FILE, "utf8")) };
  } catch {
    cache = structuredClone(EMPTY);
  }
  return cache;
}

function flush() {
  if (writeQueued) return;
  writeQueued = true;

  setTimeout(() => {
    writeQueued = false;
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(cache, null, 2));
  }, 40);
}

function matches(row, where) {
  return Object.entries(where).every(([key, value]) => {
    if (Array.isArray(value)) return value.includes(row[key]);
    return String(row[key]) === String(value);
  });
}

function nextId(rows) {
  return rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
}

export const fileDriver = {
  kind: "file",

  async init() {
    load();
  },

  async all(table, where = {}, { orderBy, limit } = {}) {
    let rows = load()[table].filter((row) => matches(row, where));

    if (orderBy) {
      const [column, dir = "asc"] = orderBy.split(" ");
      rows = [...rows].sort((a, b) => {
        const diff = a[column] > b[column] ? 1 : a[column] < b[column] ? -1 : 0;
        return dir.toLowerCase() === "desc" ? -diff : diff;
      });
    }

    return limit ? rows.slice(0, limit) : rows;
  },

  async one(table, where) {
    return (await this.all(table, where))[0] || null;
  },

  async insert(table, row) {
    const rows = load()[table];
    const record = { id: row.id ?? nextId(rows), ...row };
    record.id = row.id ?? record.id;
    rows.push(record);
    flush();
    return record;
  },

  async update(table, where, patch) {
    let changed = 0;
    load()[table].forEach((row) => {
      if (!matches(row, where)) return;
      Object.assign(row, patch);
      changed += 1;
    });
    flush();
    return changed;
  },

  async remove(table, where) {
    const store = load();
    const before = store[table].length;
    store[table] = store[table].filter((row) => !matches(row, where));
    flush();
    return before - store[table].length;
  },

  async increment(table, where, column, by = 1) {
    let changed = 0;
    load()[table].forEach((row) => {
      if (!matches(row, where)) return;
      row[column] = (Number(row[column]) || 0) + by;
      changed += 1;
    });
    flush();
    return changed;
  },
};
