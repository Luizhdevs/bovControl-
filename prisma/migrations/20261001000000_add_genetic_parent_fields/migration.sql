-- AddColumn: geneticMotherName e fatherName no modelo Animal
-- Para nascimentos por TE: identidade genética externa (não cadastrada na fazenda)

ALTER TABLE "animals" ADD COLUMN "geneticMotherName" TEXT;
ALTER TABLE "animals" ADD COLUMN "fatherName" TEXT;
