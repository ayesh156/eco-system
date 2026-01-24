-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('PAYMENT', 'OVERDUE');

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "overdueReminderTemplate" TEXT,
ADD COLUMN     "paymentReminderTemplate" TEXT,
ADD COLUMN     "reminderEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "invoice_reminders" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL DEFAULT 'PAYMENT',
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT,
    "customerPhone" TEXT,
    "customerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_reminders_invoiceId_idx" ON "invoice_reminders"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_reminders_shopId_idx" ON "invoice_reminders"("shopId");

-- CreateIndex
CREATE INDEX "invoice_reminders_sentAt_idx" ON "invoice_reminders"("sentAt");

-- AddForeignKey
ALTER TABLE "invoice_reminders" ADD CONSTRAINT "invoice_reminders_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_reminders" ADD CONSTRAINT "invoice_reminders_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
