# Radar Venezuela — piloto Barquisimeto

Versión 0.2. Radar de anuncios inmobiliarios con web de búsqueda y dashboard privado. Entrega local, todavía sin despliegue público.

## Ejecutar
Requiere Node.js 24. No hay paquetes que instalar.
```
node server.mjs
```
Web de usuarios: http://127.0.0.1:3000/
Dashboard: http://127.0.0.1:3000/admin

La primera visita al dashboard permite crear el administrador con nombre, email y contraseña de al menos 10 caracteres. Las cuentas creadas desde la web son clientes y no pueden leer leads internos ni modificar anuncios. Contraseñas con scrypt y salt aleatorio; sesión de 24 horas en cookie HttpOnly y SameSite. No hay recuperación de contraseña, verificación de email ni endurecimiento para exposición pública todavía.

## Capturar anuncios
```
node collector.mjs
```
Captura la primera página de apartamentos en venta y alquiler de Barquisimeto en Rent-A-House. Lee robots.txt, comprueba las rutas y espera 10 segundos entre consultas. Requiere acceso a internet. No recorre todo el inventario ni otros portales.

El capturador identifica cada anuncio por fuente, código y operación. Una nueva observación actualiza el registro y conserva el historial de precio y las coordenadas corregidas manualmente. No elimina anuncios por no aparecer en esta muestra. Si cambia la estructura o no reconoce anuncios, se detiene sin interpretar la respuesta como inventario vacío. La deduplicación entre distintos portales queda pendiente.

Para validar un HTML guardado sin acceso externo:
```
node collector.mjs --file archivo.html venta
```
En esta sesión se capturaron 24 anuncios públicos y se repitió la captura: 0 nuevos, 24 actualizados. Los datos y cuentas locales no se incluyen en GitHub.

## Web del usuario
Filtros por operación, municipio, parroquia, sector/urbanización, calle, tipo, precio y moneda. Las opciones provienen de datos presentes en los anuncios; no se inventan catálogos administrativos ni calles. Lara y Barquisimeto están fijados por el piloto. Mapa y listado, enlace al anuncio original, registro e inicio de sesión y solicitud de información con consentimiento. Las solicitudes generan leads privados.

El mapa usa Leaflet y OpenStreetMap, con conexión a internet. Ejecuta `node geolocate.mjs` para consultar las fichas de Rent-A-House y recuperar sus coordenadas publicadas. Respeta robots.txt y espera al menos 10 segundos entre consultas; conserva las coordenadas ya guardadas. Rechaza coordenadas ausentes, no numéricas o fuera del área amplia del piloto (latitud 9.7–10.6, longitud -70–-69); este control no verifica la dirección ni el límite municipal. Los puntos publicados pueden ser imprecisos: su exactitud debe confirmarse con el anunciante. La corrección manual desde el dashboard permite ajustar ubicación y precisión. No se asigna una ubicación inventada cuando faltan coordenadas.

La primera consulta de fichas recuperó 21 ubicaciones de 24 anuncios; 3 quedaron pendientes (incluido un timeout). Cada tarjeta localizada ofrece «Ver en mapa». Los anuncios que comparten coordenadas se agrupan en un punto consultable.

## Dashboard privado
Indicadores de anuncios activos y leads, registro y edición internos, mapa, reformas y sección de fuentes con capturas e indicadores de cambios de precio. La ejecución del capturador se realiza desde el servidor; no hay agenda automática ni botón de captura en esta versión.

## Archivos y datos
server.mjs: servidor y validación de registros.
portal.mjs: cuentas, sesiones, autorización y consultas.
collector.mjs: capturador e importación con historial.
geolocate.mjs: extracción de coordenadas publicadas en las fichas.
public/portal.html y portal.js: web del usuario.
public/index.html y app.js: dashboard.
data/radar.sqlite: anuncios, contactos, cuentas y sesiones locales, excluidos de Git.

Para respaldar, detener la aplicación y copiar data/radar.sqlite a un lugar privado.

## Validación
```
node --test
```
Pruebas: persistencia, edición, coordenadas, importación repetida, historial de precio, reglas de rutas, acceso privado, separación de roles y creación de leads por consultas. Revisión en navegador: listado real, filtro de alquiler (12 resultados), mapa y acceso previo a pedir información.

## Pendiente
Verificación de ubicaciones publicadas, geocodificación de pendientes y catálogo territorial verificado; fotos y uso de contenido de terceros para publicación; fuentes adicionales; deduplicación entre portales; capturas programadas y diagnóstico de fallos; email verificado y recuperación de cuenta; despliegue con HTTPS y protección de autenticación para acceso remoto.

Repositorio principal: alescri23-star/radar-inmobiliario-ve-selecciona.
Repositorio estratégico: alescri23-star/radar-venezuela-20268-2030, sin modificaciones.
