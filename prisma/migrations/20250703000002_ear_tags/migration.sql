-- CreateTable
CREATE TABLE "ear_tag_templates" (
    "id"                TEXT             NOT NULL,
    "farmId"            TEXT             NOT NULL,
    "name"              TEXT             NOT NULL,
    "widthMm"           DOUBLE PRECISION NOT NULL DEFAULT 50,
    "heightMm"          DOUBLE PRECISION NOT NULL DEFAULT 25,
    "paddingMm"         DOUBLE PRECISION NOT NULL DEFAULT 3,
    "fontSizeMain"      INTEGER          NOT NULL DEFAULT 14,
    "fontSizeSecondary" INTEGER          NOT NULL DEFAULT 9,
    "qrSizeMm"          DOUBLE PRECISION NOT NULL DEFAULT 18,
    "showAnimalName"    BOOLEAN          NOT NULL DEFAULT false,
    "showAnimalTag"     BOOLEAN          NOT NULL DEFAULT true,
    "showFarmName"      BOOLEAN          NOT NULL DEFAULT false,
    "showBorder"        BOOLEAN          NOT NULL DEFAULT true,
    "orientation"       TEXT             NOT NULL DEFAULT 'landscape',
    "bgColor"           TEXT             NOT NULL DEFAULT '#FFFFFF',
    "textColor"         TEXT             NOT NULL DEFAULT '#000000',
    "layoutJson"        JSONB            NOT NULL DEFAULT '{}',
    "createdAt"         TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ear_tag_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ear_tag_templates_farmId_idx" ON "ear_tag_templates"("farmId");

-- AddForeignKey
ALTER TABLE "ear_tag_templates" ADD CONSTRAINT "ear_tag_templates_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
