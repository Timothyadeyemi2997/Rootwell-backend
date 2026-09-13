/*
  Warnings:

  - You are about to drop the column `ScheduledEndAt` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `scheduleAt` on the `Booking` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "ScheduledEndAt",
DROP COLUMN "scheduleAt",
ADD COLUMN     "scheduledEndAt" TIMESTAMP(3);
