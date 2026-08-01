import mysql from "mysql2/promise";

/** Only these columns may be written, per table. Keeps generated SQL safe. */
const COLUMNS = {
  activation_codes: ["id", "code", "label", "max_uses", "used_count", "active", "expires_at", "created_at"],
  users: ["id", "username", "avatar_key", "activation_id", "last_seen_at", "created_at"],
  rooms: ["id", "name", "genre", "description", "quote", "cover_key", "track_id", "locked",
    "password_hash", "member_count", "owner_id", "created_at"],
  room_members: ["room_id", "user_id", "role", "joined_at"],
  messages: ["id", "room_id", "user_id", "kind", "body", "track_id", "pinned", "reactions", "created_at"],
};

function guard(table, keys) {
  const allowed = COLUMNS[table];
  if (!allowed) throw new Error(`Unknown table: ${table}`);

  const bad = keys.filter((key) => !allowed.includes(key));
  if (bad.length) throw new Error(`Unknown column(s) on ${table}: ${bad.join(", ")}`);
}

function whereClause(table, where) {
  const keys = Object.keys(where);
  if (keys.length === 0) return { sql: "", params: [] };

  guard(table, keys);
  const parts = [];
  const params = [];

  keys.forEach((key) => {
    const value = where[key];
    if (Array.isArray(value)) {
      parts.push(`\`${key}\` IN (${value.map(() => "?").join(", ")})`);
      params.push(...value);
    } else {
      parts.push(`\`${key}\` = ?`);
      params.push(value);
    }
  });

  return { sql: ` WHERE ${parts.join(" AND ")}`, params };
}

export function createMysqlDriver(config) {
  const pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: false,
  });

  return {
    kind: "mysql",

    async init() {
      const conn = await pool.getConnection();
      conn.release();
    },

    async all(table, where = {}, { orderBy, limit } = {}) {
      const clause = whereClause(table, where);
      let sql = `SELECT * FROM \`${table}\`${clause.sql}`;

      if (orderBy) {
        const [column, dir = "asc"] = orderBy.split(" ");
        guard(table, [column]);
        sql += ` ORDER BY \`${column}\` ${dir.toLowerCase() === "desc" ? "DESC" : "ASC"}`;
      }
      if (limit) sql += ` LIMIT ${Number(limit)}`;

      const [rows] = await pool.query(sql, clause.params);
      return rows;
    },

    async one(table, where) {
      return (await this.all(table, where, { limit: 1 }))[0] || null;
    },

    async insert(table, row) {
      const keys = Object.keys(row);
      guard(table, keys);

      const sql = `INSERT INTO \`${table}\` (${keys.map((k) => `\`${k}\``).join(", ")}) `
        + `VALUES (${keys.map(() => "?").join(", ")})`;

      const [result] = await pool.query(sql, Object.values(row));
      return { id: row.id ?? result.insertId, ...row };
    },

    async update(table, where, patch) {
      const keys = Object.keys(patch);
      guard(table, keys);

      const clause = whereClause(table, where);
      const sql = `UPDATE \`${table}\` SET ${keys.map((k) => `\`${k}\` = ?`).join(", ")}${clause.sql}`;

      const [result] = await pool.query(sql, [...Object.values(patch), ...clause.params]);
      return result.affectedRows;
    },

    async remove(table, where) {
      const clause = whereClause(table, where);
      const [result] = await pool.query(`DELETE FROM \`${table}\`${clause.sql}`, clause.params);
      return result.affectedRows;
    },

    async increment(table, where, column, by = 1) {
      guard(table, [column]);
      const clause = whereClause(table, where);
      const sql = `UPDATE \`${table}\` SET \`${column}\` = \`${column}\` + ?${clause.sql}`;
      const [result] = await pool.query(sql, [by, ...clause.params]);
      return result.affectedRows;
    },
  };
}
