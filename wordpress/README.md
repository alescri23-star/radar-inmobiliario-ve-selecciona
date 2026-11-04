# Web pública en WordPress

Esta carpeta contiene dos paquetes independientes:

- `radar-venezuela`: tema visual responsive de Radar Venezuela.
- `radar-core`: complemento con inmuebles publicados, filtros y solicitudes privadas.

El laboratorio y el panel administrativo de análisis no forman parte de WordPress y deben permanecer en una aplicación privada separada.

## Instalación

1. Instala WordPress en un dominio o subdominio de pruebas.
2. En **Apariencia → Temas → Añadir tema**, sube `radar-venezuela.zip` y actívalo.
3. En **Plugins → Añadir plugin**, sube `radar-core.zip` y actívalo.
4. En **Ajustes → Lectura**, selecciona una página estática como portada para que WordPress use `front-page.php`.
5. En **Apariencia → Menús**, crea el menú principal.
6. En **Ajustes → Privacidad**, crea o selecciona la política de privacidad.

## Contenido

El complemento añade:

- **Inmuebles**: solo aparecen públicamente cuando un administrador los publica.
- **Solicitudes**: registros privados creados desde el formulario público.
- `[radar_inmuebles]`: cuadrícula de inmuebles. Acepta `limite` y `filtros`.
- `[radar_contacto]`: formulario con consentimiento, nonce, campo trampa y límite básico por IP.

No se cargan automáticamente anuncios obtenidos de terceros. Antes de publicar cualquier inmueble deben comprobarse la autorización, disponibilidad, precio, ubicación y derechos de uso de las fotografías.

## Seguridad y operación

- Mantener WordPress, el tema y el complemento actualizados.
- Activar HTTPS, copias de seguridad y autenticación reforzada para administradores.
- No guardar contraseñas ni claves en el tema o el repositorio.
- El formulario guarda la solicitud dentro de WordPress; no envía datos a servicios externos.
- Definir una política de conservación y eliminación de solicitudes antes de abrir la web al público.

## Pendiente antes de publicar

- Confirmar dominio, textos legales y datos de contacto del responsable.
- Crear contenido real autorizado y sustituir cualquier demostración.
- Revisar el formulario y la política de privacidad con asesoramiento legal aplicable.
- Realizar pruebas visuales y funcionales dentro de la instalación real de WordPress.
