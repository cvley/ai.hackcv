-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN     "notified" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Feedback_notified_idx" ON "Feedback"("notified");
