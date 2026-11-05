# Diseño de Cafeto

## Diseño y accesibilidad

Los tokens de color, tipografía, radios y movimiento viven en el bloque
`@theme` de `src/app/globals.css`. El diseño reutiliza café, miel y crema,
Fraunces para títulos y Plus Jakarta Sans para cuerpo.

- `olivo-admin` distingue las acciones del panel; `max-w-admin` limita su contenedor.
- `max-w-modal-venta` mantiene el registro de ventas centrado y legible.
- `google-atribucion` permite la atribución textual exigida por la integración opcional de Maps.
- `--scale-resena-estrella`, `--rotate-resena-animo` y `--scale-resena-animo`
  controlan el pulso y el balanceo sin mover el área táctil.
- `--desplazamiento-resena-mirada`, `--scale-resena-parpadeo`,
  `--scale-resena-sonrisa` y `--scale-resena-destello` dan vida al gesto elegido.
- Las animaciones `--animate-resena-*` reutilizan las duraciones y curvas del
  tema, se reproducen una vez por interacción y respetan `prefers-reduced-motion`.

Las estrellas aparecen normales al abrir la invitación. Solo la elegida
revela su expresión. Los controles conservan etiquetas accesibles, foco visible
y áreas táctiles adecuadas para celular.
