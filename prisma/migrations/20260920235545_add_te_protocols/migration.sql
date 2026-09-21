-- CreateEnum
CREATE TYPE "TEProtocolStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TEParticipationStatus" AS ENUM ('ACTIVE', 'DISCONTINUED', 'COMPLETED');

-- AlterTable
ALTER TABLE "ear_tag_templates" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "te_protocols" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TEProtocolStatus" NOT NULL DEFAULT 'ACTIVE',
    "opuDate" DATE NOT NULL,
    "teDate" DATE NOT NULL,
    "laboratorio" TEXT,
    "touro" TEXT,
    "doadoras" TEXT,
    "dgP30Start" DATE,
    "dgP30End" DATE,
    "dgP60Start" DATE,
    "dgP60End" DATE,
    "prevParto" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "te_protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "te_participations" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "status" "TEParticipationStatus" NOT NULL DEFAULT 'ACTIVE',
    "reproductionId" TEXT,
    "donor" TEXT,
    "ovaQuality" TEXT,
    "sexo" TEXT,
    "discontinuedAt" TIMESTAMP(3),
    "discontinuedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "te_participations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "te_protocols_farmId_status_idx" ON "te_protocols"("farmId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "te_participations_reproductionId_key" ON "te_participations"("reproductionId");

-- CreateIndex
CREATE INDEX "te_participations_protocolId_status_idx" ON "te_participations"("protocolId", "status");

-- CreateIndex
CREATE INDEX "te_participations_animalId_status_idx" ON "te_participations"("animalId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "te_participations_animalId_protocolId_key" ON "te_participations"("animalId", "protocolId");

-- AddForeignKey
ALTER TABLE "te_protocols" ADD CONSTRAINT "te_protocols_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "te_participations" ADD CONSTRAINT "te_participations_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "te_protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "te_participations" ADD CONSTRAINT "te_participations_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "te_participations" ADD CONSTRAINT "te_participations_reproductionId_fkey" FOREIGN KEY ("reproductionId") REFERENCES "reproductions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
