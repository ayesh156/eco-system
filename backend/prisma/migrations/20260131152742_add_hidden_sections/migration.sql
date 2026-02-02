-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "hiddenSections" TEXT[] DEFAULT ARRAY[]::TEXT[];
