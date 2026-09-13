/*
  Warnings:

  - A unique constraint covering the columns `[callRoomUrl]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "callRoomUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_callRoomUrl_key" ON "Booking"("callRoomUrl");
