-- Mantiene reseñas y estados anteriores. `rechazada` se presenta como Oculta.
ALTER TABLE invitaciones ADD COLUMN creada_por TEXT;
ALTER TABLE invitaciones ADD COLUMN consumo_id TEXT;
CREATE UNIQUE INDEX idx_invitaciones_consumo ON invitaciones(consumo_id) WHERE consumo_id IS NOT NULL;
-- Una renovación invalida los enlaces anteriores, incluidos los vencidos.
UPDATE invitaciones SET revocada_en = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE usada_en IS NULL AND revocada_en IS NULL AND rowid NOT IN
 (SELECT MAX(rowid) FROM invitaciones WHERE usada_en IS NULL AND revocada_en IS NULL GROUP BY pedido_id);
CREATE UNIQUE INDEX idx_invitacion_abierta ON invitaciones(pedido_id) WHERE usada_en IS NULL AND revocada_en IS NULL;
CREATE UNIQUE INDEX idx_resena_invitacion ON resenas(invitacion_id);
ALTER TABLE resenas ADD COLUMN identificacion TEXT NOT NULL DEFAULT 'invitado' CHECK(identificacion IN ('invitado', 'google'));
ALTER TABLE resenas ADD COLUMN consentimiento_version TEXT;
ALTER TABLE resenas ADD COLUMN consentimiento_en TEXT;
ALTER TABLE resenas ADD COLUMN publicada_en TEXT;
ALTER TABLE resenas ADD COLUMN moderacion_id TEXT;
UPDATE resenas SET identificacion = 'google' WHERE autor_google_sub IS NOT NULL;
UPDATE resenas SET publicada_en = moderada_en WHERE estado = 'aprobada';
-- La cancelación conserva la opinión; la etiqueta se deriva de la venta actual.
CREATE TABLE limites_resenas (clave TEXT PRIMARY KEY, intentos INTEGER NOT NULL, expira_en INTEGER NOT NULL);
