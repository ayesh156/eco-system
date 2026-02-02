-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "adminHiddenSections" TEXT[] DEFAULT ARRAY[]::TEXT[];
