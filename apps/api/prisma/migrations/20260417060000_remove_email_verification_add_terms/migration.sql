-- AlterTable
ALTER TABLE "User"
ADD COLUMN "username" TEXT,
ADD COLUMN "identity" TEXT,
ADD COLUMN "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
DROP COLUMN IF EXISTS "isEmailVerified",
DROP COLUMN IF EXISTS "verificationTokenHash",
DROP COLUMN IF EXISTS "verificationCodeHash",
DROP COLUMN IF EXISTS "verificationCodeExpiry";

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
