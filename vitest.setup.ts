import { vi } from "vitest";

// Next.js's bundler swaps this package for a no-op when building server
// code; under plain Node (Vitest) it throws unconditionally, so every
// "server-only" source file needs it stubbed to be importable in tests.
vi.mock("server-only", () => ({}));
