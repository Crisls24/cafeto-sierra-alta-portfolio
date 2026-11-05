# Seguridad y datos privados

## Qué puede versionarse

Código fuente, migraciones de esquema, pruebas con datos ficticios, imágenes
públicas y configuración de ejemplo sin credenciales.

Los identificadores públicos de cliente OAuth, referencias de D1, URLs públicas
y etiquetas de verificación de buscadores no son contraseñas ni tokens de acceso.
Conocerlos no otorga permiso para administrar servicios.

## Qué debe permanecer fuera de Git

- Contraseñas, tokens personales, claves de API privadas y secretos OAuth.
- `.dev.vars`, archivos `.env` con valores reales y credenciales de Cloudflare.
- Bases de datos, exportaciones SQL, respaldos y enlaces privados de invitación.
- Ventas reales, costos de proveedor, gastos e informes internos.
- Capturas o registros que incluyan información de clientes o sesiones.

Los datos operativos locales se guardan en `private/` o `.wrangler/`, ambas
ignoradas por Git. Los datos persistentes del sistema viven en D1. Los ejemplos
del repositorio son ficticios y no deben importarse en producción.

## Controles del sistema

La administración requiere Cloudflare Access. El Worker valida el JWT antes
de aceptar peticiones administrativas. `ACCESS_DEV_BYPASS` se utiliza solo
en desarrollo local y no debe existir en producción.

Las invitaciones de reseña se almacenan como hash, tienen caducidad, pueden
revocarse y se consumen atómicamente. La identidad opcional de Google se valida
en el servidor. Los secretos de proveedores no se devuelven al navegador.

## Si se publica algo privado por error

Si es una credencial, revócala o rótala en el proveedor. Borrarla de un archivo
no basta. Evalúa el historial completo, las referencias remotas, releases y
artefactos. Una limpieza del historial requiere coordinación con quienes hayan
clonado el repositorio y copias privadas de respaldo antes de reescribirlo.

Si son datos del negocio, retíralos de la versión actual y revisa los commits
anteriores antes de hacer público el repositorio. No presupongas que un escaneo
automático puede detectar todos los formatos de secretos o información privada.

## Reportar un problema

Comunícalo de forma privada a través del contacto oficial del negocio indicado
en el sitio. No publiques claves, datos de clientes, tokens ni detalles de una
sesión en un issue público. Incluye la ruta afectada y pasos de reproducción
sin información sensible.
