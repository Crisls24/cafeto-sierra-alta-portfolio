-- ===================================================================
-- Cafeto Sierra Alta — esquema del sistema de reseñas verificadas.
--
-- Reglas que sostiene el esquema:
--  - Un pedido no puede tener más de una reseña: UNIQUE(resenas.pedido_id).
--  - Una invitación se consume una sola vez: el UPDATE condicional de
--    `worker/lib/db.ts` solo marca `usada_en` si sigue libre y el pedido
--    está entregado.
--  - La identidad de Google (fase 2) nunca prueba la compra: eso depende
--    de pedidos + invitaciones.
--  - No se guardan teléfonos, direcciones ni correos.
--
-- `usada_en = :ahora` identifica de forma única la petición que consumió la
-- invitación; la inserción de la reseña depende de ese valor, así queda
-- garantizado que sin consumo válido no hay reseña.
-- ===================================================================

CREATE TABLE pedidos (
  id            TEXT PRIMARY KEY,
  canal         TEXT NOT NULL DEFAULT 'otro'
                CHECK (canal IN ('whatsapp', 'instagram', 'presencial', 'correo', 'otro')),
  -- Referencia interna opcional (folio, nota). Nunca datos del cliente.
  referencia    TEXT,
  entregado     INTEGER NOT NULL DEFAULT 0 CHECK (entregado IN (0, 1)),
  entregado_en  TEXT,
  creado_en     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  actualizado_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE invitaciones (
  id            TEXT PRIMARY KEY,
  pedido_id     TEXT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  -- Solo el hash SHA-256 del token. El token original nunca se guarda.
  token_hash    TEXT NOT NULL UNIQUE,
  creada_en     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expira_en     TEXT NOT NULL,
  -- Marca de consumo; su valor identifica la petición, no solo el instante.
  usada_en      TEXT,
  revocada_en   TEXT
);

CREATE INDEX idx_invitaciones_pedido ON invitaciones (pedido_id);

CREATE TABLE resenas (
  id              TEXT PRIMARY KEY,
  pedido_id       TEXT NOT NULL UNIQUE REFERENCES pedidos(id) ON DELETE RESTRICT,
  invitacion_id   TEXT NOT NULL REFERENCES invitaciones(id),
  calificacion    INTEGER NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  comentario      TEXT NOT NULL,
  nombre_publico  TEXT NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  motivo_rechazo  TEXT,
  -- Identidad de Google (fase 2). No publica el correo ni prueba la compra.
  autor_google_sub TEXT,
  creada_en       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  moderada_en     TEXT,
  moderado_por    TEXT
);

CREATE INDEX idx_resenas_estado ON resenas (estado, creada_en DESC);

CREATE TABLE auditoria (
  id          TEXT PRIMARY KEY,
  actor       TEXT,
  accion      TEXT NOT NULL,
  entidad     TEXT NOT NULL,
  entidad_id  TEXT,
  -- Detalle sin secretos ni tokens completos.
  detalle     TEXT,
  creado_en   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_auditoria_creado ON auditoria (creado_en DESC);
