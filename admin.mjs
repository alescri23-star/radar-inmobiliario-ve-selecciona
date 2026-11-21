import { randomBytes, scryptSync } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {connectDatabase,initializeDatabase,adaptDatabase} from './database.mjs';

export async function provisionAdmin(directory, { email, name, password }, database) {
  email = String(email || '').trim().toLowerCase();
  name = String(name || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !name || name.length > 100 || typeof password !== 'string' || password.length < 10 || password.length > 200) throw Error('Nombre, email o contraseña no válidos.');
  const db = database ? adaptDatabase(database) : connectDatabase(directory);
  try {
    await initializeDatabase(db);
    await db.transaction(async tx => {
      if (await tx.get("SELECT id FROM users WHERE role='admin'")) throw Error('Ya existe un administrador; no se ha modificado.');
      if (await tx.get('SELECT id FROM users WHERE email=?', [email])) throw Error('El email ya pertenece a una cuenta; no se ha modificado.');
      const salt = randomBytes(16).toString('hex');
      await tx.run('INSERT INTO users VALUES(?,?,?,?,?,?)', [randomBytes(16).toString('hex'), email, name, 'admin', salt, scryptSync(password, salt, 64).toString('hex')]);
    });
  } finally { if (!database) await db.close(); }
}

export async function bootstrapAdminFromEnvironment(db) {
  if (!process.env.RADAR_ADMIN_PASSWORD || await db.get("SELECT id FROM users WHERE role='admin'")) return false;
  await provisionAdmin('', { email: process.env.RADAR_ADMIN_EMAIL, name: process.env.RADAR_ADMIN_NAME, password: process.env.RADAR_ADMIN_PASSWORD }, db);
  console.warn('Administrador inicial creado. Retira las variables RADAR_ADMIN_* y reinicia la aplicación.');
  return true;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await provisionAdmin(path.join(path.dirname(fileURLToPath(import.meta.url)), 'data'), {
      email: process.env.RADAR_ADMIN_EMAIL, name: process.env.RADAR_ADMIN_NAME, password: process.env.RADAR_ADMIN_PASSWORD
    });
    console.log('Administrador creado. Elimina las variables temporales de provisión.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { delete process.env.RADAR_ADMIN_PASSWORD; }
}
