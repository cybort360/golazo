-- CreateEnum
CREATE TYPE "PickResult" AS ENUM ('PENDING', 'WON', 'LOST', 'VOID');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "awayColor" TEXT,
ADD COLUMN     "awayFlag" TEXT,
ADD COLUMN     "awayScore" INTEGER,
ADD COLUMN     "awayTicker" TEXT,
ADD COLUMN     "homeColor" TEXT,
ADD COLUMN     "homeFlag" TEXT,
ADD COLUMN     "homeScore" INTEGER,
ADD COLUMN     "homeTicker" TEXT,
ADD COLUMN     "lockAt" TIMESTAMP(3),
ADD COLUMN     "minute" INTEGER,
ADD COLUMN     "round" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';

-- AlterTable
ALTER TABLE "TxlineEvent" ADD COLUMN     "awayScore" INTEGER,
ADD COLUMN     "homeScore" INTEGER,
ADD COLUMN     "seq" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "anonId" TEXT,
ADD COLUMN     "convertedAt" TIMESTAMP(3),
ADD COLUMN     "isGhost" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "predictionLabel" TEXT NOT NULL,
    "status" "PickResult" NOT NULL DEFAULT 'PENDING',
    "points" INTEGER NOT NULL DEFAULT 0,
    "proofRef" TEXT,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prediction_userId_idx" ON "Prediction"("userId");

-- CreateIndex
CREATE INDEX "Prediction_matchId_idx" ON "Prediction"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_userId_matchId_marketId_key" ON "Prediction"("userId", "matchId", "marketId");

-- CreateIndex
CREATE UNIQUE INDEX "TxlineEvent_matchId_seq_key" ON "TxlineEvent"("matchId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "User_anonId_key" ON "User"("anonId");

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

