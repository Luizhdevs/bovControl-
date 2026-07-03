-- CreateEnum
CREATE TYPE "VeterinaryReportSource" AS ENUM ('PRODAP', 'ZIL', 'MANUAL', 'CSV', 'OTHER');

-- CreateEnum
CREATE TYPE "VeterinaryReportStatus" AS ENUM ('DRAFT', 'IMPORTED', 'PARTIALLY_IMPORTED', 'FAILED');

-- CreateEnum
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

-- CreateEnum
CREATE TYPE "VeterinaryDayMeaning" AS ENUM (
    'DAYS_POSTPARTUM',
    'DAYS_PREGNANT',
    'DAYS_SINCE_INSEMINATION',
    'DAYS_OPEN',
    'UNKNOWN'
);

-- AlterEnum: AlertType (cannot be wrapped in a transaction)
ALTER TYPE "AlertType" ADD VALUE 'PREGNANCY_CHECK_DUE';
ALTER TYPE "AlertType" ADD VALUE 'DRY_OFF_DUE';
ALTER TYPE "AlertType" ADD VALUE 'CALVING_SOON';
ALTER TYPE "AlertType" ADD VALUE 'CALVING_OVERDUE';
ALTER TYPE "AlertType" ADD VALUE 'EMPTY_COW_LATE';
ALTER TYPE "AlertType" ADD VALUE 'HIGH_CCS';
ALTER TYPE "AlertType" ADD VALUE 'MASTITIS_FOLLOW_UP';
ALTER TYPE "AlertType" ADD VALUE 'DISCARD_REVIEW';

-- AlterEnum: HealthEventType
ALTER TYPE "HealthEventType" ADD VALUE 'MASTITIS';

-- AlterEnum: ReproductionType
ALTER TYPE "ReproductionType" ADD VALUE 'CALVING';

-- AlterTable: animals (all nullable — no impact on existing data)
ALTER TABLE "animals"
    ADD COLUMN "externalCode"           TEXT,
    ADD COLUMN "lastCalvingDate"        TIMESTAMP(3),
    ADD COLUMN "lastCcsThousand"        DOUBLE PRECISION,
    ADD COLUMN "lastVeterinaryReportAt" TIMESTAMP(3),
    ADD COLUMN "parityNumber"           INTEGER;

-- AlterTable: farm_settings (all nullable)
ALTER TABLE "farm_settings"
    ADD COLUMN "ccsAlertThreshold" DOUBLE PRECISION,
    ADD COLUMN "emptyDaysAlert"    INTEGER,
    ADD COLUMN "mastitisDaysAlert" INTEGER;

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE INDEX "veterinary_reports_farmId_reportDate_idx" ON "veterinary_reports"("farmId", "reportDate");

-- CreateIndex
CREATE INDEX "veterinary_animal_snapshots_farmId_reportId_idx" ON "veterinary_animal_snapshots"("farmId", "reportId");

-- CreateIndex
CREATE INDEX "veterinary_animal_snapshots_farmId_animalId_createdAt_idx" ON "veterinary_animal_snapshots"("farmId", "animalId", "createdAt");

-- CreateIndex
CREATE INDEX "veterinary_animal_snapshots_farmId_reportGroup_idx" ON "veterinary_animal_snapshots"("farmId", "reportGroup");

-- CreateIndex
CREATE INDEX "veterinary_animal_snapshots_farmId_expectedCalvingDate_idx" ON "veterinary_animal_snapshots"("farmId", "expectedCalvingDate");

-- CreateIndex
CREATE INDEX "veterinary_animal_snapshots_reportId_idx" ON "veterinary_animal_snapshots"("reportId");

-- CreateIndex
CREATE INDEX "animals_farmId_externalCode_idx" ON "animals"("farmId", "externalCode");

-- CreateIndex
CREATE INDEX "animals_farmId_lastCalvingDate_idx" ON "animals"("farmId", "lastCalvingDate");

-- AddForeignKey
ALTER TABLE "veterinary_reports" ADD CONSTRAINT "veterinary_reports_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veterinary_animal_snapshots" ADD CONSTRAINT "veterinary_animal_snapshots_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veterinary_animal_snapshots" ADD CONSTRAINT "veterinary_animal_snapshots_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "veterinary_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veterinary_animal_snapshots" ADD CONSTRAINT "veterinary_animal_snapshots_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
