# Propuesta: plataforma de alojamientos estilo Airbnb

Construiremos una aplicación responsive en español con dos áreas claramente separadas:

```text
Área pública                         Área privada
/                                   /admin
├─ Explorar alojamientos            ├─ Resumen operativo
├─ Filtros y disponibilidad         ├─ Gestión de alojamientos
├─ Detalle del alojamiento          ├─ Precios y disponibilidad
├─ Registro / acceso de clientes    ├─ Solicitudes de reserva
└─ Solicitud de reserva             ├─ Clientes
                                    └─ Configuración
```

## Módulos

### 1. Catálogo público
- Página pública con todos los alojamientos publicados.
- Búsqueda y filtros por ubicación, capacidad, rango de precio y fechas.
- Tarjetas con foto principal, nombre, ubicación, precio por noche y disponibilidad.
- Estados claros para alojamientos no disponibles o no publicados.

### 2. Detalle del alojamiento
- Galería de fotos.
- Descripción, servicios, reglas, capacidad, ubicación general y precio.
- Calendario de disponibilidad.
- Selector de entrada, salida y número de huéspedes.
- Cálculo estimado de noches y total antes de enviar la solicitud.

### 3. Autenticación y perfiles de clientes
- Registro e inicio de sesión con correo/contraseña y Google.
- Perfil con nombre, teléfono, avatar y preferencias básicas.
- Historial de solicitudes y estado de cada una.
- Recuperación y cambio de contraseña.

### 4. Solicitudes de reserva
- El cliente selecciona fechas, huéspedes y envía una solicitud.
- Validación para evitar fechas inválidas, solapadas o fuera de disponibilidad.
- Estados: `pendiente`, `aprobada`, `rechazada`, `cancelada` y `completada`.
- Al aprobar una solicitud, las fechas quedan bloqueadas para nuevas solicitudes.
- El cliente puede consultar el estado desde su cuenta.

### 5. Panel privado del administrador
- Acceso exclusivo para tu cuenta, con validación segura del rol en servidor.
- Resumen de solicitudes pendientes, próximas estancias, ocupación y alojamientos activos.
- Acciones rápidas para aprobar o rechazar solicitudes.

### 6. Gestión de alojamientos
- Crear, editar, publicar, ocultar y archivar alojamientos.
- Campos: nombre, ubicación, descripción, capacidad, habitaciones, baños, servicios y reglas.
- Carga, orden y eliminación de fotografías.
- Vista previa antes de publicar.

### 7. Precios y disponibilidad
- Precio base por noche por alojamiento.
- Calendario para abrir o bloquear fechas.
- Bloqueos manuales por mantenimiento o uso propio.
- Control de estancia mínima y máxima.
- En este MVP se usará un precio base; precios por temporada pueden añadirse después.

### 8. Gestión de clientes
- Listado de clientes registrados.
- Consulta de datos básicos e historial de solicitudes.
- Sin acceso a contraseñas ni datos sensibles de autenticación.

### 9. Notificaciones
- Centro de notificaciones dentro de la aplicación.
- Aviso al administrador cuando llega una solicitud.
- Aviso al cliente cuando la solicitud cambia de estado.
- Correos transaccionales se pueden incorporar como siguiente fase.

## Datos principales

- **Perfiles:** datos públicos y preferencias de clientes.
- **Roles de usuario:** tabla separada para proteger el acceso administrativo.
- **Alojamientos:** información, estado de publicación y reglas.
- **Fotos:** archivos y orden de galería.
- **Servicios:** catálogo y relación con alojamientos.
- **Disponibilidad:** rangos abiertos o bloqueados.
- **Solicitudes:** fechas, huéspedes, importe calculado y estado.
- **Notificaciones:** mensajes y estado de lectura.

## Implementación técnica

- Activar **Lovable Cloud** para base de datos, almacenamiento de fotos y autenticación.
- Crear políticas de seguridad para que:
  - cualquiera pueda consultar alojamientos publicados;
  - cada cliente solo vea y gestione su perfil y sus solicitudes;
  - únicamente tu cuenta administrativa pueda administrar el catálogo y todas las reservas.
- Mantener las páginas públicas renderizables y compartibles, con metadata SEO propia.
- Colocar todo el panel bajo rutas privadas protegidas.
- Validar datos tanto en formularios como en servidor.
- Comprobar disponibilidad nuevamente en servidor antes de crear o aprobar una solicitud para evitar dobles reservas.

## Orden de construcción

1. Activar Cloud y definir base de datos, almacenamiento, autenticación y seguridad.
2. Crear navegación, identidad visual y estructura responsive.
3. Construir catálogo público y página de detalle.
4. Implementar registro, acceso y perfiles de clientes.
5. Implementar flujo de solicitud y cálculo de estancia.
6. Construir panel administrativo y CRUD de alojamientos/fotos.
7. Añadir calendario de precios, bloqueos y aprobación de solicitudes.
8. Añadir clientes, notificaciones y pruebas completas de permisos y solapamientos.

## Fuera del MVP

No se incluirán inicialmente pagos en línea, mapa interactivo, reseñas, favoritos, precios dinámicos, múltiples administradores ni sincronización con calendarios externos. La arquitectura quedará preparada para agregarlos después.