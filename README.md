# Radar Venezuela — piloto Barquisimeto

Versión 0.2. Radar de anuncios inmobiliarios con web de búsqueda y dashboard privado. Entrega local, todavía sin despliegue público.

## Ejecutar
Requiere Node.js 24. No hay paquetes que instalar.
```
node server.mjs
```
Web de usuarios (requiere sesión): http://127.0.0.1:3000/
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

## Capturar RE/MAX
Ejecuta `node remax.mjs`. Recorre los enlaces de paginación publicados de Express, Galaxy, Royal y Synergy, con una pausa mínima de 2 segundos y respeto de robots.txt. Selecciona únicamente apartamentos en venta/alquiler cuya localidad publicada es Barquisimeto y región Lara. Incluye dirección, precio USD, características, enlace y coordenadas publicadas válidas. No usa la ubicación de la oficina como ubicación del inmueble. No representa todas las oficinas de RE/MAX ni resuelve duplicados con otros portales. Si una página falla, la pasada no se importa parcialmente. Conserva las ubicaciones corregidas y no retira anuncios por ausencias en esta consulta.

## Web del usuario
Filtros por operación, municipio, parroquia, sector/urbanización, calle, tipo, precio y moneda. Municipio y parroquia usan un catálogo inicial de Lara; las parroquias dependen del municipio elegido. Sector y calle se alimentan de los anuncios disponibles, sin asignarles una parroquia por suposición. Opciones sin anuncios clasificados muestran cero resultados. Se incluyen Terreno rústico y Terreno urbano en búsqueda y edición, aunque la captura actual solo incorpora apartamentos. La barra de cuenta muestra Cerrar sesión y el enlace Panel de administración únicamente a cuentas con rol administrador. Lara y Barquisimeto están fijados por el piloto. Mapa y listado, enlace al anuncio original, registro e inicio de sesión y solicitud de información con consentimiento. Las solicitudes generan leads privados.

El mapa usa Leaflet y OpenStreetMap, con conexión a internet. Ejecuta `node geolocate.mjs` para consultar las fichas de Rent-A-House y recuperar sus coordenadas publicadas. Respeta robots.txt y espera al menos 10 segundos entre consultas; conserva las coordenadas ya guardadas. Rechaza coordenadas ausentes, no numéricas o fuera del área amplia del piloto (latitud 9.7–10.6, longitud -70–-69); este control no verifica la dirección ni el límite municipal. Los puntos publicados pueden ser imprecisos: su exactitud debe confirmarse con el anunciante. La corrección manual desde el dashboard permite ajustar ubicación y precisión. No se asigna una ubicación inventada cuando faltan coordenadas.

La primera consulta de fichas recuperó 21 ubicaciones de 24 anuncios; 3 quedaron pendientes (incluido un timeout). Cada tarjeta localizada ofrece «Ver en mapa». Los anuncios que comparten coordenadas se agrupan en un punto consultable.

## Dashboard privado
Indicadores de anuncios activos y leads, registro y edición internos, mapa, reformas y sección de fuentes con capturas e indicadores de cambios de precio. La ejecución del capturador se realiza desde el servidor; no hay agenda automática ni botón de captura en esta versión.

## Archivos y datos
server.mjs: servidor y validación de registros.
portal.mjs: cuentas, sesiones, autorización y consultas.
collector.mjs: capturador e importación con historial.
geolocate.mjs: extracción de coordenadas publicadas en las fichas.
remax.mjs: captura paginada de apartamentos de cuatro oficinas RE/MAX.
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

Catálogo territorial inicial: https://es.wikipedia.org/wiki/Anexo:Parroquias_del_estado_Lara (nombres administrativos, cotejo del piloto Iribarren con https://mail.contraloriadebarquisimeto.gob.ve/index.php/la-institucion/resena-historica). Pendiente validar límites y clasificación de cada anuncio; este catálogo no amplía el alcance de los capturadores.

Acceso al radar: sin sesión se muestra únicamente la pantalla de entrada; la API de consulta de anuncios exige autenticación. Al salir, se invalida la sesión en el servidor, se borran anuncios y marcadores de la pantalla y se notifica el cierre a otras pestañas del mismo origen. La sesión se vuelve a comprobar al regresar a la pestaña y cada 30 segundos. El registro de clientes sigue disponible; el panel de administración continúa reservado al administrador.
