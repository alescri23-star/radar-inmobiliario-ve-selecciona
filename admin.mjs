import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { randomBytes, scryptSync } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const userSchema = 'CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,name TEXT,role TEXT,salt TEXT,password TEXT); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT,expires INTEGER)';

// Operator-only provisioning; never called by an HTTP route.
export function provisionAdmin(directory, { email, name, password }) {
  email = String(email || '').trim().toLowerCase();
  name = String(name || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !name || name.length > 100 || typeof password !== 'string' || password.length < 10 || password.length > 200) throw Error('Nombre, email o contraseña no válidos.');
  mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(path.join(directory, 'radar.sqlite'));
  try {
    db.exec(userSchema);
    db.exec('BEGIN IMMEDIATE');
    try {
      if (db.prepare("SELECT id FROM users WHERE role='admin'").get()) throw Error('Ya existe un administrador; no se ha modificado.');
      if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) throw Error('El email ya pertenece a una cuenta; no se ha modificado.');
      const salt = randomBytes(16).toString('hex');
      db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(randomBytes(16).toString('hex'), email, name, 'admin', salt, scryptSync(password, salt, 64).toString('hex'));
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  } finally { db.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    provisionAdmin(path.join(path.dirname(fileURLToPath(import.meta.url)), 'data'), {
      email: process.env.RADAR_ADMIN_EMAIL, name: process.env.RADAR_ADMIN_NAME, password: process.env.RADAR_ADMIN_PASSWORD
    });
    console.log('Administrador creado. Elimina las variables temporales de provisión.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { delete process.env.RADAR_ADMIN_PASSWORD; }
}
