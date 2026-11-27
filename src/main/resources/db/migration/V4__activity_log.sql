-- Journal d'activité de l'entreprise (T36). La table logs existait sans être utilisée (aucune ligne) :
-- l'administrateur de plateforme devient facultatif et l'horodatage textuel est remplacé par occurred_at.
-- node_id, department_id et target_user_id n'ont pas de clé étrangère : l'historique survit à la suppression
-- de l'élément, et le nom, le département et le seuil sont recopiés au moment de l'action.

ALTER TABLE logs ALTER COLUMN admin_id DROP NOT NULL;

ALTER TABLE logs ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMP WITH TIME ZONE;
UPDATE logs SET occurred_at = CURRENT_TIMESTAMP WHERE occurred_at IS NULL;
ALTER TABLE logs ALTER COLUMN occurred_at SET NOT NULL;
ALTER TABLE logs DROP COLUMN IF EXISTS timestamp;

ALTER TABLE logs ADD COLUMN IF NOT EXISTS company_id BIGINT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS actor_id BIGINT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS node_id BIGINT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS node_name VARCHAR(255);
ALTER TABLE logs ADD COLUMN IF NOT EXISTS node_kind VARCHAR(16);
ALTER TABLE logs ADD COLUMN IF NOT EXISTS department_id BIGINT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS department_name VARCHAR(255);
ALTER TABLE logs ADD COLUMN IF NOT EXISTS min_access_level INTEGER;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS target_user_id BIGINT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS target_user_name VARCHAR(255);
ALTER TABLE logs ADD COLUMN IF NOT EXISTS details VARCHAR(500);

ALTER TABLE logs ADD CONSTRAINT fk_logs_company FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE logs ADD CONSTRAINT fk_logs_actor FOREIGN KEY (actor_id) REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_logs_company_time ON logs (company_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_logs_node_time ON logs (node_id, occurred_at);
