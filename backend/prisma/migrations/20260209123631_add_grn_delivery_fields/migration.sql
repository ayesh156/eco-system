-- AlterTable
ALTER TABLE "grns" ADD COLUMN     "deliveryNote" TEXT,
ADD COLUMN     "receivedBy" TEXT,
ADD COLUMN     "receivedDate" TIMESTAMP(3),
ADD COLUMN     "vehicleNumber" TEXT;
