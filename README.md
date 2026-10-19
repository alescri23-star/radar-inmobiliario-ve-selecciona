# Radar Venezuela — piloto Barquisimeto

Versión 0.2. Radar de anuncios inmobiliarios con web de búsqueda y dashboard privado. Preparado para despliegue privado en Hostinger Business; el despliegue público sigue pendiente de autorización.

## Ejecutar
Requiere Node.js 24. Instala las dependencias con `pnpm install` o `npm install`.
En Windows, abre `Abrir Radar.cmd`. El iniciador comprueba GitHub con `git pull --ff-only`, protege cualquier cambio local sin guardar, inicia el servidor y abre el navegador.

Desde una terminal:
```
npm run start:local
```
Web de usuarios (requiere sesión): http://127.0.0.1:3014/
Dashboard: http://127.0.0.1:3014/admin

Para trabajar sin comprobar GitHub, ejecuta `npm run start:offline`; esta alternativa conserva el puerto 3000 salvo que se defina `PORT`.

El administrador inicial se crea exclusivamente desde el servidor con `node admin.mjs`, usando variables temporales RADAR_ADMIN_NAME, RADAR_ADMIN_EMAIL y RADAR_ADMIN_PASSWORD suministradas por un canal seguro. No pases contraseñas como argumentos ni las guardes en el repositorio. Retira esas variables después. El comando conserva las cuentas existentes y rechaza crear otro administrador o reutilizar un email. Las cuentas creadas desde la web son clientes y no pueden leer leads internos ni modificar anuncios. Contraseñas con scrypt y salt aleatorio; sesión de 24 horas en cookie HttpOnly y SameSite=Strict, con Secure cuando RADAR_PUBLIC_URL usa HTTPS. La recuperación de contraseña requiere configurar Resend. No hay verificación de email ni endurecimiento para exposición pública todavía.

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
La vista autenticada funciona como laboratorio privado de análisis. Separa los anuncios mediante las pestañas Todos, En venta, En alquiler y Favoritos. Cada cuenta conserva sus propios favoritos y puede calificarlos como verde (muy interesante), naranja (interesante), amarillo (más o menos interesante) o rojo (nada interesante). El administrador dispone además de `Buscar / Añadir`: puede abrir una búsqueda web limitada a las fuentes compatibles o pegar un enlace HTTPS de RE/MAX Venezuela o Rent-A-House Venezuela. La captura respeta `robots.txt`, rechaza otros dominios, actualiza duplicados y guarda las fichas nuevas como borrador hasta su revisión.

Los filtros cubren municipio, parroquia, sector/urbanización, calle, tipo, precio y moneda. Municipio y parroquia usan un catálogo inicial de Lara; las parroquias dependen del municipio elegido. Sector y calle se alimentan de los anuncios disponibles, sin asignarles una parroquia por suposición. Opciones sin anuncios clasificados muestran cero resultados. La barra de cuenta muestra Cerrar sesión y el enlace Panel de administración únicamente a cuentas con rol administrador. Lara y Barquisimeto están fijados por el piloto.

La mesa de análisis mantiene el mapa visible junto a un listado compacto de 25 anuncios por página. Incorpora búsqueda por texto, precio mínimo y máximo, y orden por actualización, precio o precio por metro cuadrado. El mapa conserva todos los resultados de la selección; al pulsar un marcador, el laboratorio cambia automáticamente a la página donde aparece el anuncio y resalta su ficha.

El mapa usa Leaflet y OpenStreetMap, con conexión a internet. Ejecuta `node geolocate.mjs` para consultar las fichas de Rent-A-House y recuperar sus coordenadas publicadas. Respeta robots.txt y espera al menos 10 segundos entre consultas; conserva las coordenadas ya guardadas. Rechaza coordenadas ausentes, no numéricas o fuera del área amplia del piloto (latitud 9.7–10.6, longitud -70–-69); este control no verifica la dirección ni el límite municipal. Los puntos publicados pueden ser imprecisos: su exactitud debe confirmarse con el anunciante. La corrección manual desde el dashboard permite ajustar ubicación y precisión. No se asigna una ubicación inventada cuando faltan coordenadas.

La primera consulta de fichas recuperó 21 ubicaciones de 24 anuncios; 3 quedaron pendientes (incluido un timeout). Cada tarjeta localizada ofrece «Ver en mapa». Al pulsar un punto se abre la ficha resumida y se selecciona automáticamente el anuncio correspondiente en la columna izquierda. Los anuncios que comparten coordenadas se agrupan en un punto consultable.

## Dashboard privado
Indicadores de anuncios activos y leads, registro y edición internos, mapa, reformas y sección de fuentes con capturas e indicadores de cambios de precio. Incluye una sección privada de profesionales y empresas para registrar candidatos, servicios, número de contacto, WhatsApp confirmado, sitio web, cobertura, RIF pendiente de comprobar, responsable técnico, fuente, observaciones y fecha de revisión. La tabla separa teléfono y WhatsApp, y solo convierte sitios HTTPS válidos en enlaces clicables. Los estados son candidato, contactado, documentación pendiente, evaluado, aprobado y descartado. El registro no implica verificación ni recomendación; antes de aprobar deben comprobarse identidad, documentación, experiencia, referencias y condiciones del presupuesto. La ejecución del capturador se realiza desde el servidor; la captura manual mediante enlace está disponible para el administrador y la programación automática continúa pendiente.

La portada del dashboard funciona como centro de control: separa venta y alquiler, muestra incidencias de ubicación y clasificación, resume la evaluación de profesionales y ofrece accesos directos al mapa, inventario, leads y altas manuales. Su cuadrícula se adapta a escritorio, tableta y móvil.

### Solicitudes de profesionales

La ruta pública `/red-profesional` contiene el formulario de incorporación para empresas de reformas, constructoras, arquitectura, profesionales independientes y proveedores especializados. Envía la información a `POST /api/professional-applications` y crea una ficha privada con estado `candidato` y origen `formulario`. El formulario exige consentimiento, valida email, teléfono, tipo profesional y enlaces HTTPS, incluye un campo antispam invisible y limita los envíos por dirección durante quince minutos. No admite documentos ni datos bancarios.

La base del Radar es la fuente principal de estas solicitudes. Una integración futura con Make puede utilizarse para notificaciones, pero no es necesaria para registrar candidatos ni para gestionarlos desde el dashboard.

Los seguimientos pueden registrarse manualmente desde el panel o llegar desde el formulario de consulta de la web. El servidor asigna el origen automáticamente como `manual` o `formulario`; el panel lo muestra mediante una etiqueta y permite filtrar por procedencia. El navegador no puede elegir ni falsificar esta clasificación.

La investigación inicial del 15 de octubre de 2026 está documentada en `docs/candidatos-reformas-2026-10-15.json`. Sus registros son candidatos basados en información comercial pública y no constituyen empresas verificadas, recomendaciones ni proveedores autorizados.

## Archivos y datos
server.mjs: servidor y validación de registros.
portal.mjs: cuentas, sesiones, autorización y consultas.
collector.mjs: capturador e importación con historial.
geolocate.mjs: extracción de coordenadas publicadas en las fichas.
remax.mjs: captura paginada de apartamentos de cuatro oficinas RE/MAX.
public/portal.html y portal.js: web del usuario.
public/index.html y app.js: dashboard.
favorites.mjs: favoritos privados y nivel de interés por cuenta.
land.mjs y land-labels.mjs: clasificación textual y correcciones privadas de terrenos.
data/radar.sqlite: anuncios, contactos, cuentas y sesiones locales, excluidos de Git.
database.mjs: SQLite para desarrollo y MySQL persistente para producción.

Para respaldar el laboratorio local, detener la aplicación y copiar data/radar.sqlite a un lugar privado. En producción, usa las copias de seguridad de la base MySQL de Hostinger.

## Publicación en Hostinger Business

Hostinger ejecuta `npm start`, que inicia `server.mjs` en el puerto proporcionado por la plataforma y escucha en todas las interfaces únicamente en producción. La publicación requiere MySQL: si `NODE_ENV=production` y faltan las variables `DB_*`, el servidor se detiene para evitar usar una base SQLite dentro de una carpeta reemplazable durante los despliegues.

Configura `RADAR_PUBLIC_URL` con el origen HTTPS asignado al Radar y `RADAR_FORM_ORIGIN=https://orangered-cod-348216.hostingersite.com` para admitir el formulario de WordPress solo desde esa web. `RADAR_ADMIN_*` se usa una sola vez para crear el primer administrador; después se elimina de Hostinger y se reinicia la aplicación. Consulta `docs/despliegue-hostinger.md`.

## Validación
```
node --test
```
Pruebas: persistencia, edición, coordenadas, importación repetida, historial de precio, reglas de rutas, acceso privado, separación de roles y creación de leads por consultas. Revisión en navegador: listado real, filtro de alquiler (12 resultados), mapa y acceso previo a pedir información.

## Pendiente
Verificación de ubicaciones publicadas, geocodificación de pendientes y catálogo territorial verificado; fotos y uso de contenido de terceros para publicación; fuentes adicionales; deduplicación entre portales; capturas programadas y diagnóstico de fallos; email verificado y activación del correo de recuperación; despliegue con HTTPS y protección de autenticación para acceso remoto.

Repositorio principal: alescri23-star/radar-inmobiliario-ve-selecciona.
Repositorio estratégico: alescri23-star/radar-venezuela-20268-2030, sin modificaciones.

## Web pública en WordPress

`wordpress/` contiene un tema propio y un complemento instalable para la futura web pública en Hostinger. Incluye portada responsive, catálogo de inmuebles publicados, filtros, fichas y captación privada de solicitudes. No conecta ni publica automáticamente los datos internos del laboratorio. Consulta `wordpress/README.md` para la instalación y las comprobaciones pendientes antes de abrir la web al público.

Catálogo territorial inicial: https://es.wikipedia.org/wiki/Anexo:Parroquias_del_estado_Lara (nombres administrativos, cotejo del piloto Iribarren con https://mail.contraloriadebarquisimeto.gob.ve/index.php/la-institucion/resena-historica). Pendiente validar límites y clasificación de cada anuncio; este catálogo no amplía el alcance de los capturadores.

Acceso al radar: sin sesión se muestra únicamente la pantalla de entrada; la API de consulta de anuncios exige autenticación. Al salir, se invalida la sesión en el servidor, se borran anuncios y marcadores de la pantalla y se notifica el cierre a otras pestañas del mismo origen. La sesión se vuelve a comprobar al regresar a la pestaña y cada 30 segundos. El registro de clientes sigue disponible; el panel de administración continúa reservado al administrador.
Fondo de acceso: mapa vectorial decorativo de Venezuela con punto del piloto Barquisimeto. Geometría simplificada de https://github.com/johan/world.geo.json/blob/master/countries/VEN.geo.json; no sustituye cartografía administrativa. Integrado en el HTML, sin imágenes remotas para el fondo.

## Recuperación de contraseña
«¿Olvidaste tu contraseña?» permite solicitar un enlace por correo y elegir una nueva contraseña. Tokens aleatorios guardados solo como hash, válidos 30 minutos y de un uso. Una solicitud nueva invalida la anterior; cambiar la contraseña revoca todas las sesiones. Límite de solicitudes por IP y respuesta idéntica para correos registrados y desconocidos.

Envío mediante Resend (https://resend.com/docs/api-reference/emails/send-email). Copia .env.example a .env, configura RESEND_API_KEY y RADAR_MAIL_FROM con un remitente verificado, y RADAR_PUBLIC_URL con la URL real del portal. Ejecuta `node --env-file=.env server.mjs`. Nunca subir .env a GitHub. La URL localhost solo sirve en el equipo donde corre el piloto; para clientes remotos configurar el dominio HTTPS. Sin configuración, la pantalla informa que la recuperación por correo aún no está habilitada; no simula un envío. Pruebas con entrega simulada: expiración, invalidación de enlaces anteriores, uso único, nueva contraseña y cierre de sesiones. Entrega real pendiente de configurar Resend.

Terrenos: RE/MAX incorpora también Terreno y Parcela en Barquisimeto. La superficie usa areaTerreno. La clasificación automática busca declaraciones expresas de terreno urbano/rústico en el título y la descripción; los restantes quedan como Terreno sin clasificar. Cada usuario puede corregir la categoría desde la ficha sin alterar la revisión de otras cuentas. Es una clasificación de trabajo basada en el anuncio, no una verificación urbanística ni catastral. El dashboard permite filtrar todos los terrenos y cada categoría.

La revisión manual del 12 de octubre de 2026 está documentada en `docs/revision-terrenos-2026-10-12.json`: 43 anuncios revisados, 38 clasificados como urbanos, 4 como rústicos y 1 pendiente. El informe contiene enlaces y evidencia pública; no incluye la base SQLite ni datos privados. Estas conclusiones requieren confirmación documental antes de cualquier decisión de inversión.

Fotos de anuncios: los capturadores guardan la URL de la foto principal publicada por cada fuente. Portal con foto en la tarjeta y dashboard con miniatura en la primera columna. URLs limitadas a los CDN de RE/MAX y Rent-A-House, carga diferida y sin referrer. No se descarga ni archiva contenido multimedia. Imagen ausente o fallida: Foto no disponible. La disponibilidad depende de la fuente; confirmar derechos antes de publicar fuera del piloto local.


## Cambios de acceso y galería (2026-10-10)

La raíz es la única aplicación ejecutable. La copia incompleta de outputs/radar-venezuela se consolidó aquí; su contenido anterior permanece en el historial Git. Se conserva SQLite, Node.js 24, Leaflet y el diseño existente. No se migran datos ni se despliega con este cambio.

La galería se abre desde «Ver fotos» en el portal y el dashboard. Solo usuarios autenticados acceden a fotos; clientes solo ven anuncios activos. La consulta externa de galerías está desactivada por defecto. RADAR_GALLERY_REMOTE=true permite activarla únicamente después de autorizar la fuente y sus condiciones de uso. robots.txt no sustituye esa autorización.

Para HTTPS detrás de un proxy, configura RADAR_PUBLIC_URL=https://tu-dominio.example y NODE_ENV=production. El proxy debe terminar TLS y reenviar al servidor que escucha en 127.0.0.1. No se confía en X-Forwarded-Proto ni en X-Forwarded-Host. El origen configurado es la autoridad; las peticiones que escriben deben incluir Origin exactamente igual. Clientes API también deben enviarlo. Sin RADAR_PUBLIC_URL solo se admiten hosts loopback con el puerto del servidor, para desarrollo local. Producción rechaza arrancar sin HTTPS configurado.

GET /api/session conserva setupRequired como indicador de que falta un administrador; no habilita ningún alta web. /api/setup devuelve 403 siempre. POST /api/register siempre crea clientes. GET /api/gallery/:id devuelve fotos filtradas o un mensaje si no están disponibles (401 sin sesión, 404 para anuncios inexistentes o no visibles, 405 para otros métodos).

Consulta docs/seguridad-y-validacion.md para pruebas, límites y reversión.
