-- ================================================================
-- BovControl — Migration: Módulo de Etiquetas de Brinco
-- ================================================================
-- Cria a tabela ear_tag_templates para armazenar modelos de etiqueta.
--
-- GARANTIAS:
--   • Transação única — falha reverte tudo automaticamente
--   • Apenas criação de tabela nova (zero impacto no banco atual)
--   • FK com CASCADE para manter integridade referencial com farms
-- ================================================================

BEGIN;

CREATE TABLE ear_tag_templates (
  id                  TEXT         NOT NULL,
  "farmId"            TEXT         NOT NULL,
  name                TEXT         NOT NULL,
  "widthMm"           DOUBLE PRECISION NOT NULL DEFAULT 50,
  "heightMm"          DOUBLE PRECISION NOT NULL DEFAULT 25,
  "paddingMm"         DOUBLE PRECISION NOT NULL DEFAULT 3,
  "fontSizeMain"      INTEGER      NOT NULL DEFAULT 14,
  "fontSizeSecondary" INTEGER      NOT NULL DEFAULT 9,
  "qrSizeMm"          DOUBLE PRECISION NOT NULL DEFAULT 18,
  "showAnimalName"    BOOLEAN      NOT NULL DEFAULT false,
  "showAnimalTag"     BOOLEAN      NOT NULL DEFAULT true,
  "showFarmName"      BOOLEAN      NOT NULL DEFAULT false,
  "showBorder"        BOOLEAN      NOT NULL DEFAULT true,
  orientation         TEXT         NOT NULL DEFAULT 'landscape',
  "bgColor"           TEXT         NOT NULL DEFAULT '#FFFFFF',
  "textColor"         TEXT         NOT NULL DEFAULT '#000000',
  "layoutJson"        JSONB        NOT NULL DEFAULT '{}',
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ear_tag_templates_pkey PRIMARY KEY (id)
);

-- Índice para busca por fazenda
CREATE INDEX ear_tag_templates_farmId_idx ON ear_tag_templates("farmId");

-- FK para farms com CASCADE: se a fazenda for deletada, remove os templates
ALTER TABLE ear_tag_templates
  ADD CONSTRAINT ear_tag_templates_farmId_fkey
  FOREIGN KEY ("farmId")
  REFERENCES farms(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

COMMIT;

-- ================================================================
-- VERIFICAÇÃO (opcional — rode após o COMMIT)
-- ================================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_name = 'ear_tag_templates';
-- ================================================================
