-- Conserva precios históricos y permite importar totales sin inventar el desglose.
ALTER TABLE pedidos ADD COLUMN venta_vendedora INTEGER NOT NULL DEFAULT 0 CHECK (venta_vendedora IN (0, 1));
ALTER TABLE pedidos ADD COLUMN fecha_aproximada INTEGER NOT NULL DEFAULT 0 CHECK (fecha_aproximada IN (0, 1));
ALTER TABLE pedidos ADD COLUMN total_reportado_centavos INTEGER CHECK (total_reportado_centavos IS NULL OR total_reportado_centavos >= 0);
ALTER TABLE pedidos ADD COLUMN envio_centavos INTEGER NOT NULL DEFAULT 0 CHECK (envio_centavos >= 0);
ALTER TABLE pedidos ADD COLUMN importacion_clave TEXT;
CREATE UNIQUE INDEX idx_pedidos_importacion ON pedidos(importacion_clave) WHERE importacion_clave IS NOT NULL;

-- NULL significa precio no desglosado, nunca una bolsa regalada.
CREATE TABLE pedido_items_importables (
  id TEXT PRIMARY KEY,
  pedido_id TEXT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id TEXT REFERENCES productos(id) ON DELETE SET NULL,
  presentacion_id TEXT REFERENCES presentaciones(id) ON DELETE SET NULL,
  nombre_producto TEXT NOT NULL,
  nombre_presentacion TEXT NOT NULL,
  molienda TEXT CHECK (molienda IS NULL OR molienda IN ('grano-entero', 'molido')),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario_centavos INTEGER CHECK (precio_unitario_centavos IS NULL OR precio_unitario_centavos >= 0),
  costo_unitario_centavos INTEGER CHECK (costo_unitario_centavos IS NULL OR costo_unitario_centavos >= 0),
  orden INTEGER NOT NULL DEFAULT 0,
  creado_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT INTO pedido_items_importables SELECT * FROM pedido_items;
DROP TABLE pedido_items;
ALTER TABLE pedido_items_importables RENAME TO pedido_items;
CREATE INDEX idx_pedido_items_pedido ON pedido_items(pedido_id, orden);
CREATE INDEX idx_pedido_items_producto ON pedido_items(producto_id);
