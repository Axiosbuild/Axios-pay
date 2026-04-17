-- AlterTable
ALTER TABLE "User"
ADD COLUMN "verificationTokenHash" TEXT,
ADD COLUMN "verificationCodeHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_verificationTokenHash_key" ON "User"("verificationTokenHash");
