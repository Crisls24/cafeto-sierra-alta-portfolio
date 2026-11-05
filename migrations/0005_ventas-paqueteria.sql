ALTER TABLE pedidos ADD COLUMN por_paqueteria INTEGER NOT NULL DEFAULT 0 CHECK (por_paqueteria IN (0, 1));
-- Conserva el envío de Monterrey que ya estaba incluido en su total histórico.
UPDATE pedidos SET por_paqueteria = 1 WHERE envio_centavos > 0;
