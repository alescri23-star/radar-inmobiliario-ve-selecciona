# Despliegue de Radar en Hostinger Business

Estado: aplicación y base MySQL desplegadas en `https://white-shrew-789999.hostingersite.com`; cuenta administrativa inicial pendiente de provisión segura.

## Recursos separados

- Crear una **nueva aplicación web Node.js** en una dirección temporal de Hostinger.
- No modificar `dashboard.macundalesycorotos.com` ni la web WordPress existente.
- Conectar la aplicación al repositorio `alescri23-star/radar-inmobiliario-ve-selecciona` y a la rama autorizada.
- Crear una base MySQL exclusiva para Radar dentro del plan Business.

## Configuración de la aplicación

- Node.js: 24.x
- Tipo: Other / aplicación de servidor
- Comando de inicio: `npm start`
- Archivo de entrada, si Hostinger lo solicita: `server.mjs`
- Puerto: usar `PORT` suministrado por Hostinger; el valor por defecto es 3000.

Variables obligatorias, introducidas en Hostinger y nunca en GitHub:

```text
NODE_ENV=production
RADAR_PUBLIC_URL=https://DIRECCION-TEMPORAL-DEL-RADAR
RADAR_FORM_ORIGIN=https://orangered-cod-348216.hostingersite.com
DB_HOST=localhost
DB_PORT=3306
DB_USER=VALOR-DE-HOSTINGER
DB_PASSWORD=VALOR-DE-HOSTINGER
DB_NAME=VALOR-DE-HOSTINGER
RADAR_GALLERY_REMOTE=false
```

Para el primer arranque se añaden temporalmente `RADAR_ADMIN_NAME`, `RADAR_ADMIN_EMAIL` y `RADAR_ADMIN_PASSWORD`. Cuando el administrador existe y su acceso se ha comprobado, hay que retirar esas tres variables y reiniciar la aplicación.

## Verificación antes de conectar WordPress

1. Abrir la URL temporal y comprobar la pantalla de acceso.
2. Iniciar sesión como administrador y confirmar que `/admin` está protegido.
3. Crear un registro de demostración, reiniciar la aplicación y confirmar que permanece en MySQL.
4. Comprobar que un origen ajeno recibe 403 en `POST /api/professional-applications`.
5. Sustituir `RADAR_API_URL` en `docs/hostinger-formulario-red-profesional.html` por la URL HTTPS real seguida de `/api/professional-applications`.
6. Enviar una candidatura de prueba desde WordPress y confirmar que aparece como `candidato` y `formulario` en Red profesional.
7. Eliminar la candidatura de prueba si contiene datos ficticios que ya no sean necesarios.

## Datos y copias de seguridad

SQLite se conserva para el laboratorio local. Producción utiliza MySQL porque las carpetas administradas de cada despliegue se reemplazan. No se migran usuarios, sesiones, leads ni datos de contacto sin una decisión expresa. Antes de abrir el Radar a terceros, configurar y probar las copias de seguridad de MySQL.
