# Fuentes inmobiliarias del Radar

Cada fuente se integra por separado. Todos los anuncios nuevos se guardan como borrador o quedan sujetos a revisión humana; el Radar nunca fusiona ni retira anuncios automáticamente.

| Fuente | Integración actual | Estado |
| --- | --- | --- |
| Rent-A-House | Actualización controlada respetando `robots.txt` | Operativa |
| RE/MAX | Actualización controlada respetando `robots.txt` | Operativa |
| AC Inmobiliarias | Captura manual pegando el enlace de una ficha | Piloto |
| eBienesRaices | Captura manual pegando el enlace de una ficha | Piloto |
| Mercado Libre Inmuebles | API oficial | Requiere registrar una aplicación y credenciales seguras |
| Century 21 Venezuela | Captura piloto del inventario público de Lara, respetando `robots.txt` | Piloto |

## Century 21 Venezuela

El conector consulta únicamente la búsqueda pública del estado Lara y lee el inventario incluido por la propia página. No visita cada ficha, no guarda datos de contacto de asesores y no descarga fotografías; conserva, cuando existe, la URL de una miniatura servida por la fuente. Una pasada solo se importa si el número de resultados coincide con el total anunciado. Los registros nuevos se crean como borradores y las ausencias se limitan a una alerta de revisión después de dos capturas completas consecutivas.

## Mercado Libre

No se debe rastrear la interfaz web. La ampliación se hará mediante la API oficial de Mercado Libre. Las credenciales se configurarán como secretos de Hostinger y nunca se escribirán en Git:

- `MELI_CLIENT_ID`
- `MELI_CLIENT_SECRET`
- `MELI_REDIRECT_URI`

Antes de activar el conector se debe completar OAuth, almacenar y rotar de forma segura el token de actualización y limitar la búsqueda a inmuebles de Barquisimeto/Lara. El resultado entrará en revisión igual que el resto de las fuentes.

## Duplicados y frescura

Cada anuncio recibe una huella de comparación (`dedupeKey`). Sirve para mostrar posibles duplicados entre fuentes, pero no los elimina ni combina. Las fuentes automáticas conservan historial de precios y marcan como “posiblemente retirado” un anuncio que deja de aparecer en ejecuciones completas consecutivas.
