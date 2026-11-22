# Correcciones de acceso y galería

Fecha: 2026-10-10. Base: feat/base-radar-barquisimeto, 4395d2c. Rama: fix/galeria-acceso-seguro.

## Decisiones
- Una sola aplicación en la raíz: se incorpora la galería desarrollada en outputs y se retira esa copia incompleta. No cambia el almacenamiento ni el esquema de cuentas existente.
- Alta de administrador por operador local, en transacción y sin sobrescribir cuentas. El alta pública queda cerrada incluso con base vacía. No se provisionó ninguna cuenta real durante este trabajo.
- Un origen de confianza explícito con RADAR_PUBLIC_URL y cookies Secure en HTTPS, incluido logout y recuperación. Origin obligatorio en operaciones de escritura; encabezados del proxy no deciden la confianza.
- Consultas externas de galería desactivadas por defecto. Fotos guardadas siguen disponibles; confirmar derechos antes de publicarlas.

## Validación automatizada
12 pruebas pasan con Node.js 24: parsers sobre HTML ficticio, persistencia, edición, referencias, separación de roles, consultas con consentimiento, recuperación de contraseña, galería, cierre del alta pública, cookies HTTPS y rechazo de orígenes incorrectos/ausentes. Bases temporales y correo simulado; ninguna captura ni correo real. Se verificó que HTML, script de galería y favicon responden desde la raíz. El recorrido de API de consulta y administración continúa pasando.

No se ha probado un proxy TLS real, Hostinger, entrega de correo real ni un despliegue público. La comprobación de cookies usa HTTP local y examina los encabezados del modo HTTPS; no equivale a una prueba TLS en navegador. No se declara terminado el MVP completo.

## Operación y reversión
Antes de integrar, detener el servicio y respaldar data/radar.sqlite de forma privada. Las cuentas existentes siguen funcionando: no ejecutar admin.mjs si ya hay administrador. Para una base nueva, suministrar las tres variables temporales del README desde el gestor de secretos o una entrada segura y ejecutar admin.mjs; retirarlas después. El servidor y el comando usan data/ junto a los módulos.

Arranque local: node server.mjs. Con configuración: node --env-file=.env server.mjs. Pruebas: node --test --test-timeout=20000. La app no carga .env automáticamente. No guardar credenciales en Git, argumentos ni ejemplos.

Reversión: restaurar la versión anterior del código en un entorno cerrado, sin borrar SQLite; este cambio no modifica datos existentes ni requiere una migración destructiva. La versión anterior reabre el alta pública y no debe exponerse a internet.

## Pendientes para acceso público
Verificación de email; revisión de autorización y derechos de cada fuente; protección distribuida contra abuso (los límites actuales son por proceso y detrás de proxy pueden agrupar usuarios); auditoría persistente; política de privacidad y retención; backup automatizado con restauración probada; proxy HTTPS real y pruebas visuales del flujo completo; métricas y supervisión. Costes de alojamiento y correo sin confirmar: no se han contratado servicios.
