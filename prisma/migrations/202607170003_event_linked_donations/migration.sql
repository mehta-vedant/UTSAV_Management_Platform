ALTER TABLE "Donation"
  ADD COLUMN "eventId" TEXT;

CREATE INDEX "Donation_eventId_idx" ON "Donation"("eventId");

ALTER TABLE "Donation"
  ADD CONSTRAINT "Donation_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
