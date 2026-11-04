import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createApp } from './server.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3014);

try {
  const pending = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim();
  if (pending) {
    console.warn('Actualización omitida: hay cambios locales sin guardar. El laboratorio arrancará con la copia actual.');
  } else {
    execFileSync('git', ['pull', '--ff-only'], { cwd: root, stdio: 'inherit' });
  }
} catch (error) {
  console.warn('No se pudo comprobar GitHub. El laboratorio arrancará con la última copia disponible en este equipo.');
}

createApp().listen(port, '127.0.0.1', () => console.log(`Radar Venezuela: http://127.0.0.1:${port}`));
