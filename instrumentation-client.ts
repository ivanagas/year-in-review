import posthog from "posthog-js";

posthog.init('phc_MnIJcO4lkvLeNOoPGzTL1i4g8Ea24TSUchJRFxseNmU', {
  api_host: "/addstuff-blah",
  ui_host: "https://us.posthog.com",
  // Include the defaults option as required by PostHog
  defaults: "2025-11-30",
  // Enables capturing unhandled exceptions via Error Tracking
  capture_exceptions: true,
  // Turn on debug in development mode
  debug: process.env.NODE_ENV === "development",
});

// IMPORTANT: Never combine this approach with other client-side PostHog initialization approaches,
// especially components like a PostHogProvider. instrumentation-client.ts is the correct solution
// for initializing client-side PostHog in Next.js 15.3+ apps.
