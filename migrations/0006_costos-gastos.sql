-- El cobro de envío no es su costo. NULL mantiene pendiente ese gasto.
ALTER TABLE pedidos ADD COLUMN costo_envio_centavos INTEGER
  CHECK (costo_envio_centavos IS NULL OR costo_envio_centavos >= 0);

-- Gastos conocidos solo por mes: no se inventa un día para asignarlos a semanas.
-- Equipo se separa del gasto operativo; no pretende ser depreciación contable.
CREATE TABLE gastos_mensuales (
  id TEXT PRIMARY KEY,
  periodo TEXT NOT NULL CHECK (periodo GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  concepto TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('equipo', 'operativo')),
  importe_centavos INTEGER CHECK (importe_centavos IS NULL OR importe_centavos >= 0),
  fuente TEXT NOT NULL
);
CREATE INDEX idx_gastos_periodo ON gastos_mensuales(periodo);
