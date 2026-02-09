-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "grnOverdueReminderTemplate" TEXT,
ADD COLUMN     "grnPaymentReminderTemplate" TEXT,
ADD COLUMN     "grnReminderEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "grn_reminders" (
    "id" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL DEFAULT 'PAYMENT',
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT,
    "supplierPhone" TEXT,
    "supplierName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grn_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grn_reminders_grnId_idx" ON "grn_reminders"("grnId");

-- CreateIndex
CREATE INDEX "grn_reminders_shopId_idx" ON "grn_reminders"("shopId");

-- CreateIndex
CREATE INDEX "grn_reminders_sentAt_idx" ON "grn_reminders"("sentAt");

-- AddForeignKey
ALTER TABLE "grn_reminders" ADD CONSTRAINT "grn_reminders_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "grns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_reminders" ADD CONSTRAINT "grn_reminders_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
