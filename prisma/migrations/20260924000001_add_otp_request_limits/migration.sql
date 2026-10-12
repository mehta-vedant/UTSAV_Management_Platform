-- Rate-limit anonymous OTP requests across serverless instances.
CREATE TABLE "OtpRequestLimit" (
    "key" TEXT NOT NULL,
    "windowStartedAt" TIMESTAMPTZ(3) NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpRequestLimit_pkey" PRIMARY KEY ("key"),
    CONSTRAINT "OtpRequestLimit_requests_positive" CHECK ("requests" > 0)
);
