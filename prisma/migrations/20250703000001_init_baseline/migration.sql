-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('HEAT', 'PREGNANCY_CHECK', 'DRY_OFF', 'CALVING', 'VACCINATION', 'WEIGHT_CHECK');

-- CreateEnum
CREATE TYPE "AnimalStatus" AS ENUM ('ACTIVE', 'SOLD', 'DEAD', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "BirthType" AS ENUM ('NATURAL', 'INSEMINATION', 'EMBRYO_TRANSFER');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('CALF', 'HEIFER', 'COW', 'BULL', 'STEER');

-- CreateEnum
CREATE TYPE "HealthEventType" AS ENUM ('VACCINATION', 'DISEASE', 'DEWORMING', 'EXAM', 'OTHER', 'MEDICATION');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LotType" AS ENUM ('LACTATING', 'DRY', 'HEIFER', 'CALF', 'FATTENING', 'MIXED', 'MATERNITY', 'BREEDING');

-- CreateEnum
CREATE TYPE "MilkShift" AS ENUM ('MORNING', 'AFTERNOON');

-- CreateEnum
CREATE TYPE "MilkStatus" AS ENUM ('LACTATING', 'DRY', 'DRY_PREGNANT', 'HEIFER', 'NA');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "Purpose" AS ENUM ('DAIRY', 'BEEF', 'BOTH');

-- CreateEnum
CREATE TYPE "ReproductionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReproductionType" AS ENUM ('INSEMINATION', 'NATURAL_MATING', 'PREGNANCY_CHECK');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER', 'WORKER', 'VIEWER');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "animalId" TEXT,
    "type" "AlertType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animal_feed_consumptions" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "feedSessionId" TEXT NOT NULL,
    "consumedKg" DOUBLE PRECISION NOT NULL,
    "estimatedCost" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "animal_feed_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animal_photos" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sizeKb" INTEGER NOT NULL DEFAULT 0,
    "thumbnailUrl" TEXT,

    CONSTRAINT "animal_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animals" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "name" TEXT,
    "sex" "Sex" NOT NULL,
    "category" "Category" NOT NULL,
    "breed" TEXT NOT NULL DEFAULT 'Mestiço',
    "status" "AnimalStatus" NOT NULL DEFAULT 'ACTIVE',
    "purpose" "Purpose" NOT NULL DEFAULT 'DAIRY',
    "birthDate" TIMESTAMP(3),
    "birthType" "BirthType",
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitDate" TIMESTAMP(3),
    "exitReason" TEXT,
    "motherId" TEXT,
    "fatherId" TEXT,
    "lotId" TEXT,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "estimatedFeedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalFeedConsumedKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "milkStatus" "MilkStatus" NOT NULL DEFAULT 'NA',

    CONSTRAINT "animals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_settings" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "mainProductionLotId" TEXT,
    "enableMilkParticipants" BOOLEAN NOT NULL DEFAULT true,
    "autoUpdateMilkStatus" BOOLEAN NOT NULL DEFAULT true,
    "useEstimatedMilkPerCow" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farm_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_users" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'WORKER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farm_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT NOT NULL DEFAULT 'MG',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "storageUsedMb" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "farms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_sessions" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "feedTypeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "bagCount" INTEGER NOT NULL,
    "totalWeightKg" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "animalCount" INTEGER NOT NULL,
    "averageKgPerAnimal" DOUBLE PRECISION NOT NULL,
    "averageCostPerAnimal" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_types" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "weightPerBagKg" DOUBLE PRECISION NOT NULL,
    "pricePerBag" DOUBLE PRECISION NOT NULL,
    "proteinPercent" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_events" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "type" "HealthEventType" NOT NULL,
    "description" TEXT NOT NULL,
    "medication" TEXT,
    "cost" DOUBLE PRECISION,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "health_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'WORKER',
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lots" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LotType" NOT NULL DEFAULT 'MIXED',
    "maxCapacity" INTEGER,
    "pastureId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "observations" TEXT,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milk_records" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "liters" DOUBLE PRECISION NOT NULL,
    "shift" "MilkShift" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotency_key" TEXT,

    CONSTRAINT "milk_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milking_session_participants" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "liters" DOUBLE PRECISION,
    "isEstimated" BOOLEAN NOT NULL DEFAULT true,
    "idempotency_key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milking_session_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milking_sessions" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "shift" "MilkShift" NOT NULL,
    "date" DATE NOT NULL,
    "totalLiters" DOUBLE PRECISION NOT NULL,
    "milkingCows" INTEGER NOT NULL,
    "notes" TEXT,
    "idempotency_key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pastures" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "areaHectares" DOUBLE PRECISION,
    "grassType" TEXT,
    "maxCapacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pastures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reproductions" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "type" "ReproductionType" NOT NULL,
    "status" "ReproductionStatus" NOT NULL DEFAULT 'PENDING',
    "date" TIMESTAMP(3) NOT NULL,
    "bullName" TEXT,
    "result" TEXT,
    "nextCheckDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reproductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "weight_records" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "weight_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider" ASC, "providerAccountId" ASC);

-- CreateIndex
CREATE INDEX "alerts_farmId_status_idx" ON "alerts"("farmId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "animal_feed_consumptions_animalId_createdAt_idx" ON "animal_feed_consumptions"("animalId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "animal_photos_animalId_takenAt_idx" ON "animal_photos"("animalId" ASC, "takenAt" ASC);

-- CreateIndex
CREATE INDEX "animals_farmId_category_idx" ON "animals"("farmId" ASC, "category" ASC);

-- CreateIndex
CREATE INDEX "animals_farmId_createdAt_idx" ON "animals"("farmId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "animals_farmId_lotId_idx" ON "animals"("farmId" ASC, "lotId" ASC);

-- CreateIndex
CREATE INDEX "animals_farmId_status_idx" ON "animals"("farmId" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "animals_farmId_tag_key" ON "animals"("farmId" ASC, "tag" ASC);

-- CreateIndex
CREATE INDEX "animals_fatherId_idx" ON "animals"("fatherId" ASC);

-- CreateIndex
CREATE INDEX "animals_motherId_idx" ON "animals"("motherId" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_entityId_idx" ON "audit_logs"("entityId" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_farmId_entity_createdAt_idx" ON "audit_logs"("farmId" ASC, "entity" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "farm_settings_farmId_key" ON "farm_settings"("farmId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "farm_users_farmId_userId_key" ON "farm_users"("farmId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "feed_sessions_farmId_date_idx" ON "feed_sessions"("farmId" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "feed_sessions_lotId_date_idx" ON "feed_sessions"("lotId" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "feed_types_farmId_active_idx" ON "feed_types"("farmId" ASC, "active" ASC);

-- CreateIndex
CREATE INDEX "health_events_animalId_occurredAt_idx" ON "health_events"("animalId" ASC, "occurredAt" ASC);

-- CreateIndex
CREATE INDEX "invites_email_status_idx" ON "invites"("email" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "invites_farmId_status_idx" ON "invites"("farmId" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "invites_token_key" ON "invites"("token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "lots_farmId_name_key" ON "lots"("farmId" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "milk_records_animalId_recordedAt_idx" ON "milk_records"("animalId" ASC, "recordedAt" ASC);

-- CreateIndex
CREATE INDEX "milk_records_farmId_recordedAt_idx" ON "milk_records"("farmId" ASC, "recordedAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "milk_records_idempotency_key_key" ON "milk_records"("idempotency_key" ASC);

-- CreateIndex
CREATE INDEX "milking_session_participants_animalId_createdAt_idx" ON "milking_session_participants"("animalId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "milking_session_participants_idempotency_key_key" ON "milking_session_participants"("idempotency_key" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "milking_session_participants_sessionId_animalId_key" ON "milking_session_participants"("sessionId" ASC, "animalId" ASC);

-- CreateIndex
CREATE INDEX "milking_sessions_farmId_date_idx" ON "milking_sessions"("farmId" ASC, "date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "milking_sessions_farmId_shift_date_key" ON "milking_sessions"("farmId" ASC, "shift" ASC, "date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "milking_sessions_idempotency_key_key" ON "milking_sessions"("idempotency_key" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "pastures_farmId_name_key" ON "pastures"("farmId" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "reproductions_animalId_type_date_idx" ON "reproductions"("animalId" ASC, "type" ASC, "date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier" ASC, "token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token" ASC);

-- CreateIndex
CREATE INDEX "weight_records_animalId_measuredAt_idx" ON "weight_records"("animalId" ASC, "measuredAt" ASC);

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_feed_consumptions" ADD CONSTRAINT "animal_feed_consumptions_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_feed_consumptions" ADD CONSTRAINT "animal_feed_consumptions_feedSessionId_fkey" FOREIGN KEY ("feedSessionId") REFERENCES "feed_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_photos" ADD CONSTRAINT "animal_photos_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_fatherId_fkey" FOREIGN KEY ("fatherId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_settings" ADD CONSTRAINT "farm_settings_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_settings" ADD CONSTRAINT "farm_settings_mainProductionLotId_fkey" FOREIGN KEY ("mainProductionLotId") REFERENCES "lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_users" ADD CONSTRAINT "farm_users_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_users" ADD CONSTRAINT "farm_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_sessions" ADD CONSTRAINT "feed_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_sessions" ADD CONSTRAINT "feed_sessions_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_sessions" ADD CONSTRAINT "feed_sessions_feedTypeId_fkey" FOREIGN KEY ("feedTypeId") REFERENCES "feed_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_sessions" ADD CONSTRAINT "feed_sessions_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_types" ADD CONSTRAINT "feed_types_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_events" ADD CONSTRAINT "health_events_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_pastureId_fkey" FOREIGN KEY ("pastureId") REFERENCES "pastures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milk_records" ADD CONSTRAINT "milk_records_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milking_session_participants" ADD CONSTRAINT "milking_session_participants_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milking_session_participants" ADD CONSTRAINT "milking_session_participants_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "milking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milking_sessions" ADD CONSTRAINT "milking_sessions_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastures" ADD CONSTRAINT "pastures_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reproductions" ADD CONSTRAINT "reproductions_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_records" ADD CONSTRAINT "weight_records_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
