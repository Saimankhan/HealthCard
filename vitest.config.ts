import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    // Dummy values so env.server.ts/env.client.ts don't throw when a test
    // transitively imports a module that reads them — tests should never
    // depend on a real .env file being present.
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/test",
      BETTER_AUTH_SECRET: "test-secret-at-least-32-characters-long",
      BETTER_AUTH_URL: "http://localhost:3000",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "test-token",
      R2_ACCOUNT_ID: "test-account",
      R2_ACCESS_KEY_ID: "test-key",
      R2_SECRET_ACCESS_KEY: "test-secret",
      R2_BUCKET_NAME: "test-bucket",
      R2_ENDPOINT: "https://example-r2.example.com",
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "587",
      SMTP_USER: "test-user",
      SMTP_PASS: "test-pass",
      STRIPE_SECRET_KEY: "sk_test_dummy",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_dummy",
    },
  },
});
