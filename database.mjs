import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

const sqliteSchema = [
  'CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,kind TEXT NOT NULL,body TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,name TEXT,role TEXT,salt TEXT,password TEXT)',
  'CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT,expires INTEGER)',
  'CREATE TABLE IF NOT EXISTS favorites(user_id TEXT NOT NULL,property_id TEXT NOT NULL,interest TEXT NOT NULL,PRIMARY KEY(user_id,property_id))',
  'CREATE TABLE IF NOT EXISTS land_labels(user_id TEXT NOT NULL,property_id TEXT NOT NULL,classification TEXT NOT NULL,PRIMARY KEY(user_id,property_id))',
  'CREATE TABLE IF NOT EXISTS password_resets(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires INTEGER NOT NULL)'
];

const mysqlSchema = [
  'CREATE TABLE IF NOT EXISTS records(id VARCHAR(191) PRIMARY KEY,kind VARCHAR(40) NOT NULL,body LONGTEXT NOT NULL,INDEX records_kind(kind)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'CREATE TABLE IF NOT EXISTS users(id VARCHAR(64) PRIMARY KEY,email VARCHAR(254) UNIQUE,name VARCHAR(100),role VARCHAR(30),salt VARCHAR(64),password VARCHAR(256)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'CREATE TABLE IF NOT EXISTS sessions(token VARCHAR(64) PRIMARY KEY,user_id VARCHAR(64),expires BIGINT,INDEX sessions_user(user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'CREATE TABLE IF NOT EXISTS favorites(user_id VARCHAR(64) NOT NULL,property_id VARCHAR(191) NOT NULL,interest VARCHAR(30) NOT NULL,PRIMARY KEY(user_id,property_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'CREATE TABLE IF NOT EXISTS land_labels(user_id VARCHAR(64) NOT NULL,property_id VARCHAR(191) NOT NULL,classification VARCHAR(60) NOT NULL,PRIMARY KEY(user_id,property_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'CREATE TABLE IF NOT EXISTS password_resets(token VARCHAR(64) PRIMARY KEY,user_id VARCHAR(64) NOT NULL,expires BIGINT NOT NULL,INDEX resets_user(user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
];

function sqliteAdapter(raw, owned = false) {
  const adapter = {
    dialect: 'sqlite', raw,
    async exec(sql) { raw.exec(sql); },
    async get(sql, params = []) { return raw.prepare(sql).get(...params); },
    async all(sql, params = []) { return raw.prepare(sql).all(...params); },
    async run(sql, params = []) { return raw.prepare(sql).run(...params); },
    async upsertRecord(id, kind, body) { raw.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(id, kind, body); },
    async upsertFavorite(userId, propertyId, interest) { raw.prepare('INSERT INTO favorites VALUES(?,?,?) ON CONFLICT(user_id,property_id) DO UPDATE SET interest=excluded.interest').run(userId, propertyId, interest); },
    async upsertLandLabel(userId, propertyId, classification) { raw.prepare('INSERT INTO land_labels VALUES(?,?,?) ON CONFLICT(user_id,property_id) DO UPDATE SET classification=excluded.classification').run(userId, propertyId, classification); },
    async transaction(work) { raw.exec('BEGIN IMMEDIATE'); try { const value = await work(adapter); raw.exec('COMMIT'); return value; } catch (error) { raw.exec('ROLLBACK'); throw error; } },
    async close() { if (owned) raw.close(); }
  };
  return adapter;
}

function mysqlAdapter(pool) {
  const adapter = {
    dialect: 'mysql', raw: pool,
    async exec(sql) { await pool.query(sql); },
    async get(sql, params = []) { const [rows] = await pool.execute(sql, params); return rows[0]; },
    async all(sql, params = []) { const [rows] = await pool.execute(sql, params); return rows; },
    async run(sql, params = []) { const [result] = await pool.execute(sql, params); return result; },
    async upsertRecord(id, kind, body) { await pool.execute('INSERT INTO records(id,kind,body) VALUES(?,?,?) ON DUPLICATE KEY UPDATE kind=VALUES(kind),body=VALUES(body)', [id, kind, body]); },
    async upsertFavorite(userId, propertyId, interest) { await pool.execute('INSERT INTO favorites(user_id,property_id,interest) VALUES(?,?,?) ON DUPLICATE KEY UPDATE interest=VALUES(interest)', [userId, propertyId, interest]); },
    async upsertLandLabel(userId, propertyId, classification) { await pool.execute('INSERT INTO land_labels(user_id,property_id,classification) VALUES(?,?,?) ON DUPLICATE KEY UPDATE classification=VALUES(classification)', [userId, propertyId, classification]); },
    async transaction(work) { const connection = await pool.getConnection(); const scoped = mysqlAdapter(connection); try { await connection.beginTransaction(); const value = await work(scoped); await connection.commit(); return value; } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); } },
    async close() { await pool.end(); }
  };
  return adapter;
}

export function adaptDatabase(db) {
  if (db?.dialect) return db;
  if (db?.prepare) return sqliteAdapter(db);
  throw Error('Base de datos no compatible');
}

export function connectDatabase(directory) {
  const mysqlConfigured = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].every(key => process.env[key]);
  if (mysqlConfigured) {
    return mysqlAdapter(mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 8,
      charset: 'utf8mb4'
    }));
  }
  if (process.env.NODE_ENV === 'production') throw Error('Producción requiere DB_HOST, DB_USER, DB_PASSWORD y DB_NAME.');
  mkdirSync(directory, { recursive: true });
  const raw = new DatabaseSync(path.join(directory, 'radar.sqlite'));
  raw.exec('PRAGMA foreign_keys=ON');
  return sqliteAdapter(raw, true);
}

export async function initializeDatabase(db) {
  for (const statement of db.dialect === 'mysql' ? mysqlSchema : sqliteSchema) await db.exec(statement);
}
