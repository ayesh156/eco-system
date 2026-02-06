-- CreateTable
CREATE TABLE "grn_payments" (
    "id" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "message" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grn_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grn_payments_grnId_idx" ON "grn_payments"("grnId");

-- CreateIndex
CREATE INDEX "grn_payments_shopId_idx" ON "grn_payments"("shopId");

-- AddForeignKey
ALTER TABLE "grn_payments" ADD CONSTRAINT "grn_payments_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "grns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_payments" ADD CONSTRAINT "grn_payments_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_payments" ADD CONSTRAINT "grn_payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
