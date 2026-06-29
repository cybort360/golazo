-- CreateIndex
CREATE UNIQUE INDEX "ProofReceipt_marketId_walletAddress_key" ON "ProofReceipt"("marketId", "walletAddress");
