-- ============================================================
-- MIGRATION: Módulo Veterinário (Sprint 9.1A)
-- Aplicar no Neon (produção) via painel SQL ou prisma migrate deploy.
-- TODOS os campos novos em tabelas existentes são NULLABLE.
-- SEM DROP, SEM RENAME, SEM alteração destrutiva.
-- Pré-requisito: ear_tag_templates já deve existir (migration-safe-v1.sql).
-- ============================================================

-- ─── Novos enums ─────────────────────────────────────────

CREATE TYPE "VeterinaryReportSource" AS ENUM ('PRODAP', 'ZIL', 'MANUAL', 'CSV', 'OTHER');

CREATE TYPE "VeterinaryReportStatus" AS ENUM ('DRAFT', 'IMPORTED', 'PARTIALLY_IMPORTED', 'FAILED');

CREATE TYPE "VeterinaryReportGroup" AS ENUM (
  'EMPTY_NORMAL_45D',
  'EMPTY_LATE',
  'DRY_EMPTY',
  'INSEMINATED_OVER_30D',
  'TO_DRY',
  'PREGNANT_HEIFER',
  'LACTATING_PREGNANT',
  'DRY_PREGNANT',
  'CLOSE_UP',
  'UNKNOWN'
);

CREATE TYPE "VeterinaryDayMeaning" AS ENUM (
  'DAYS_POSTPARTUM',
  'DAYS_PREGNANT',
  'DAYS_SINCE_INSEMINATION',
  'DAYS_OPEN',
  'UNKNOWN'
);

-- ─── Extensão de enums existentes ─────────────────────────
-- ALTER TYPE ... ADD VALUE não pode ser revertido em transação no PostgreSQL.
-- Neon usa PostgreSQL 16+ — compatível com múltiplos ADD VALUE em uma migration.

ALTER TYPE "AlertType" ADD VALUE 'PREGNANCY_CHECK_DUE';
ALTER TYPE "AlertType" ADD VALUE 'DRY_OFF_DUE';
ALTER TYPE "AlertType" ADD VALUE 'CALVING_SOON';
ALTER TYPE "AlertType" ADD VALUE 'CALVING_OVERDUE';
ALTER TYPE "AlertType" ADD VALUE 'EMPTY_COW_LATE';
ALTER TYPE "AlertType" ADD VALUE 'HIGH_CCS';
ALTER TYPE "AlertType" ADD VALUE 'MASTITIS_FOLLOW_UP';
ALTER TYPE "AlertType" ADD VALUE 'DISCARD_REVIEW';

ALTER TYPE "HealthEventType" ADD VALUE 'MASTITIS';

ALTER TYPE "ReproductionType" ADD VALUE 'CALVING';

-- ─── Campos novos em tabelas existentes ───────────────────
-- Todos NULLABLE — sem DEFAULT obrigatório — sem impacto em dados existentes.

ALTER TABLE "animals"
  ADD COLUMN "externalCode"           TEXT,
  ADD COLUMN "lastCalvingDate"        TIMESTAMP(3),
  ADD COLUMN "lastCcsThousand"        DOUBLE PRECISION,
  ADD COLUMN "lastVeterinaryReportAt" TIMESTAMP(3),
  ADD COLUMN "parityNumber"           INTEGER;

ALTER TABLE "farm_settings"
  ADD COLUMN "ccsAlertThreshold" DOUBLE PRECISION,
  ADD COLUMN "emptyDaysAlert"    INTEGER,
  ADD COLUMN "mastitisDaysAlert" INTEGER;

-- ─── Novas tabelas ────────────────────────────────────────

CREATE TABLE "veterinary_reports" (
  "id"                TEXT                     NOT NULL,
  "farmId"            TEXT                     NOT NULL,
  "reportDate"        DATE                     NOT NULL,
  "sourceSystem"      "VeterinaryReportSource" NOT NULL DEFAULT 'PRODAP',
  "technicianName"    TEXT,
  "externalFarmName"  TEXT,
  "externalOwnerName" TEXT,
  "originalFilename"  TEXT,
  "originalFileUrl"   TEXT,
  "importStatus"      "VeterinaryReportStatus" NOT NULL DEFAULT 'DRAFT',
  "totalRows"         INTEGER                  NOT NULL DEFAULT 0,
  "matchedRows"       INTEGER                  NOT NULL DEFAULT 0,
  "unmatchedRows"     INTEGER                  NOT NULL DEFAULT 0,
  "importedByUserId"  TEXT                     NOT NULL,
  "metadata"          JSONB,
  "createdAt"         TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3)             NOT NULL,

  CONSTRAINT "veterinary_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "veterinary_animal_snapshots" (
  "id"                    TEXT                    NOT NULL,
  "farmId"                TEXT                    NOT NULL,
  "reportId"              TEXT                    NOT NULL,
  "animalId"              TEXT,
  "externalCode"          TEXT,
  "animalName"            TEXT,
  "reportGroup"           "VeterinaryReportGroup" NOT NULL DEFAULT 'UNKNOWN',
  "rawGroupLabel"         TEXT,
  "parityNumber"          INTEGER,
  "lastCalvingDate"       TIMESTAMP(3),
  "rp"                    TEXT,
  "sx"                    TEXT,
  "inseminationDate"      TIMESTAMP(3),
  "inseminationNumber"    INTEGER,
  "reportDays"            INTEGER,
  "dayMeaning"            "VeterinaryDayMeaning"  NOT NULL DEFAULT 'UNKNOWN',
  "bullName"              TEXT,
  "expectedCalvingDate"   TIMESTAMP(3),
  "milkPeak"              DOUBLE PRECISION,
  "milkCurrent"           DOUBLE PRECISION,
  "breed"                 TEXT,
  "fatherName"            TEXT,
  "cScore"                DOUBLE PRECISION,
  "tScore"                DOUBLE PRECISION,
  "occurrence"            TEXT,
  "discardRecommendation" TEXT,
  "mastitisDays"          INTEGER,
  "ccsThousand"           DOUBLE PRECISION,
  "isCloseUp"             BOOLEAN                 NOT NULL DEFAULT false,
  "rawRow"                JSONB,
  "createdAt"             TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "veterinary_animal_snapshots_pkey" PRIMARY KEY ("id")
);

-- ─── Índices ──────────────────────────────────────────────

CREATE INDEX "veterinary_reports_farmId_reportDate_idx"
  ON "veterinary_reports"("farmId", "reportDate");

CREATE INDEX "veterinary_animal_snapshots_farmId_reportId_idx"
  ON "veterinary_animal_snapshots"("farmId", "reportId");

CREATE INDEX "veterinary_animal_snapshots_farmId_animalId_createdAt_idx"
  ON "veterinary_animal_snapshots"("farmId", "animalId", "createdAt");

CREATE INDEX "veterinary_animal_snapshots_farmId_reportGroup_idx"
  ON "veterinary_animal_snapshots"("farmId", "reportGroup");

CREATE INDEX "veterinary_animal_snapshots_farmId_expectedCalvingDate_idx"
  ON "veterinary_animal_snapshots"("farmId", "expectedCalvingDate");

CREATE INDEX "veterinary_animal_snapshots_reportId_idx"
  ON "veterinary_animal_snapshots"("reportId");

CREATE INDEX "animals_farmId_externalCode_idx"
  ON "animals"("farmId", "externalCode");

CREATE INDEX "animals_farmId_lastCalvingDate_idx"
  ON "animals"("farmId", "lastCalvingDate");

-- ─── Foreign Keys ─────────────────────────────────────────

ALTER TABLE "veterinary_reports"
  ADD CONSTRAINT "veterinary_reports_farmId_fkey"
  FOREIGN KEY ("farmId") REFERENCES "farms"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "veterinary_animal_snapshots"
  ADD CONSTRAINT "veterinary_animal_snapshots_farmId_fkey"
  FOREIGN KEY ("farmId") REFERENCES "farms"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "veterinary_animal_snapshots"
  ADD CONSTRAINT "veterinary_animal_snapshots_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "veterinary_reports"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "veterinary_animal_snapshots"
  ADD CONSTRAINT "veterinary_animal_snapshots_animalId_fkey"
  FOREIGN KEY ("animalId") REFERENCES "animals"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── FIM DA MIGRATION ─────────────────────────────────────
