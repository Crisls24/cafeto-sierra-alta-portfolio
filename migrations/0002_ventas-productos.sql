CREATE TABLE productos (
  id             TEXT PRIMARY KEY,
  nombre         TEXT NOT NULL,
  categoria      TEXT NOT NULL CHECK (categoria IN ('cafe', 'queso', 'miel', 'otro')),
  activo         INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
  orden          INTEGER NOT NULL DEFAULT 0,
  creado_en      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  actualizado_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE presentaciones (
  id             TEXT PRIMARY KEY,
  producto_id    TEXT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  nombre         TEXT NOT NULL,
  precio_centavos INTEGER CHECK (precio_centavos IS NULL OR precio_centavos >= 0),
  costo_centavos  INTEGER CHECK (costo_centavos IS NULL OR costo_centavos >= 0),
  activo         INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
  orden          INTEGER NOT NULL DEFAULT 0,
  creado_en      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  actualizado_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (producto_id, nombre)
);

CREATE INDEX idx_presentaciones_producto ON presentaciones (producto_id, orden);

CREATE TABLE pedido_items (
  id                        TEXT PRIMARY KEY,
  pedido_id                 TEXT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id               TEXT REFERENCES productos(id) ON DELETE SET NULL,
  presentacion_id           TEXT REFERENCES presentaciones(id) ON DELETE SET NULL,
  nombre_producto           TEXT NOT NULL,
  nombre_presentacion       TEXT NOT NULL,
  molienda                  TEXT CHECK (molienda IS NULL OR molienda IN ('grano-entero', 'molido')),
  cantidad                  INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario_centavos  INTEGER NOT NULL CHECK (precio_unitario_centavos >= 0),
  costo_unitario_centavos   INTEGER CHECK (costo_unitario_centavos IS NULL OR costo_unitario_centavos >= 0),
  orden                     INTEGER NOT NULL DEFAULT 0,
  creado_en                 TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_pedido_items_pedido ON pedido_items (pedido_id, orden);
CREATE INDEX idx_pedido_items_producto ON pedido_items (producto_id);

ALTER TABLE pedidos RENAME COLUMN canal TO canal_legacy;

ALTER TABLE pedidos ADD COLUMN canal TEXT NOT NULL DEFAULT 'otro'
  CHECK (canal IN ('whatsapp', 'instagram', 'facebook', 'presencial', 'correo', 'otro'));

UPDATE pedidos SET canal = canal_legacy;

ALTER TABLE pedidos ADD COLUMN folio INTEGER CHECK (folio IS NULL OR folio > 0);
ALTER TABLE pedidos ADD COLUMN vendido_en TEXT;
ALTER TABLE pedidos ADD COLUMN estado_entrega TEXT NOT NULL DEFAULT 'por_preparar'
  CHECK (estado_entrega IN ('por_preparar', 'listo', 'entregado', 'cancelado'));
ALTER TABLE pedidos ADD COLUMN estado_pago TEXT NOT NULL DEFAULT 'pendiente'
  CHECK (estado_pago IN ('pendiente', 'pagado'));
ALTER TABLE pedidos ADD COLUMN pagado_en TEXT;
ALTER TABLE pedidos ADD COLUMN cancelado_en TEXT;

UPDATE pedidos
SET estado_entrega = CASE WHEN entregado = 1 THEN 'entregado' ELSE 'por_preparar' END;

UPDATE pedidos
SET vendido_en = COALESCE(substr(entregado_en, 1, 10), substr(creado_en, 1, 10));

UPDATE pedidos
SET folio = (
  SELECT COUNT(*) FROM pedidos AS anterior
  WHERE anterior.creado_en < pedidos.creado_en
     OR (anterior.creado_en = pedidos.creado_en AND anterior.id <= pedidos.id)
);

CREATE UNIQUE INDEX idx_pedidos_folio ON pedidos (folio);
CREATE INDEX idx_pedidos_vendido ON pedidos (vendido_en DESC);
CREATE INDEX idx_pedidos_estado_entrega ON pedidos (estado_entrega);
CREATE INDEX idx_pedidos_estado_pago ON pedidos (estado_pago);

INSERT INTO productos (id, nombre, categoria, activo, orden) VALUES
  ('cafe-lavado', 'Café de altura lavado', 'cafe', 1, 1),
  ('cafe-honey', 'Café de altura honey', 'cafe', 1, 2),
  ('cafe-natural', 'Café de altura natural', 'cafe', 1, 3),
  ('miel-multiflora', 'Miel pura multiflora', 'miel', 1, 4),
  ('quesos-artesanales', 'Quesos artesanales', 'queso', 1, 5);

INSERT INTO presentaciones (id, producto_id, nombre, precio_centavos, costo_centavos, activo, orden) VALUES
  ('cafe-lavado-250g', 'cafe-lavado', '250 g', 10000, NULL, 1, 1),
  ('cafe-lavado-500g', 'cafe-lavado', '500 g', 19000, NULL, 1, 2),
  ('cafe-lavado-1kg', 'cafe-lavado', '1 kg', 36000, NULL, 1, 3),
  ('cafe-honey-250g', 'cafe-honey', '250 g', 10000, NULL, 1, 1),
  ('cafe-honey-500g', 'cafe-honey', '500 g', 19000, NULL, 1, 2),
  ('cafe-honey-1kg', 'cafe-honey', '1 kg', 36000, NULL, 1, 3),
  ('cafe-natural-250g', 'cafe-natural', '250 g', 10000, NULL, 1, 1),
  ('cafe-natural-500g', 'cafe-natural', '500 g', 19000, NULL, 1, 2),
  ('cafe-natural-1kg', 'cafe-natural', '1 kg', 36000, NULL, 1, 3),
  ('miel-multiflora-litro', 'miel-multiflora', 'Litro', NULL, NULL, 1, 1),
  ('miel-multiflora-cubeta-19l', 'miel-multiflora', 'Cubeta 19L', NULL, NULL, 1, 2);
