# Radar Venezuela

Base funcional local para el piloto de Barquisimeto. Versión 0.1.

## Ejecutar
Requiere Node.js 24 o posterior. No necesita instalar paquetes.

Desde esta carpeta:
```
node server.mjs
```
Abrir http://127.0.0.1:3000. Para comprobar la base: `node --test`.

El mapa utiliza Leaflet y cartografía de OpenStreetMap. Necesita internet para cargar la biblioteca y las calles. Las coordenadas se guardan localmente; no hay búsqueda automática por dirección.

## Funciones
- Mapa centrado en Barquisimeto: marcadores de inmuebles y acceso a su ficha. Pulsar el mapa permite registrar la ubicación; también se pueden introducir coordenadas manualmente.
- Dashboard: inmuebles activos, leads abiertos, reformas pendientes y seguimientos vencidos.
- Crear y editar inmuebles, leads y reformas; búsqueda y filtros de estado.
- Vincular leads y reformas a inmuebles existentes.
- Guardar datos en SQLite: data/radar.sqlite. La aplicación arranca vacía.

## Estructura
server.mjs: servidor y API local con validación.
public/: interfaz en español, adaptable a móviles.
server.test.mjs: pruebas de persistencia, edición y validación.
data/: almacenamiento local, excluido de Git.

## Límites de esta entrega
Solo uso local: escucha en 127.0.0.1 y no incluye inicio de sesión ni roles. No desplegarla para acceso compartido antes de implementar autenticación y permisos. No incluye fotos, presupuestos separados, eliminación ni exportación. Los importes no se suman entre monedas. Los datos se guardan en este ordenador; copiar data/radar.sqlite con la aplicación detenida para una copia de respaldo.

## Próximos incrementos
1. Usuarios, permisos y almacenamiento compartido.
2. Ficha ampliada de inmueble, fuente verificada, fotos y mapa.
3. Historial comercial y responsables de seguimiento.
4. Profesionales y presupuestos separados para reformas.

Repositorio principal: alescri23-star/radar-inmobiliario-ve-selecciona.
Documentación estratégica: alescri23-star/radar-venezuela-20268-2030 (sin cambios).
