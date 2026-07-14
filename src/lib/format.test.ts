import { describe, expect, it } from "vitest";

import { formatCurrency, formatEnumLabel } from "@/lib/format";

describe("formatEnumLabel", () => {
  it("converts SCREAMING_SNAKE_CASE to Title Case", () => {
    expect(formatEnumLabel("APPOINTMENT_CONFIRMATION")).toBe(
      "Appointment Confirmation"
    );
  });
});

describe("formatCurrency", () => {
  it("formats a numeric amount with the given currency", () => {
    expect(formatCurrency(42, "usd")).toBe("$42.00");
  });

  it("accepts a string amount", () => {
    expect(formatCurrency("19.99", "usd")).toBe("$19.99");
  });
});
