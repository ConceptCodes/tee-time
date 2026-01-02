import { describe, expect, test } from "bun:test";
import { redactSensitiveText } from "../sanitization";

describe("redactSensitiveText", () => {
  test("redacts email and phone with tokens", () => {
    const input = "Email me at user@example.com or call +1 (555) 555-1234.";
    const result = redactSensitiveText(input);
    expect(result.redacted).toContain("[redacted-email-1]");
    expect(result.redacted).toContain("[redacted-phone-2]");
    expect(result.redactions).toHaveLength(2);
  });

  test("redacts coordinates and address", () => {
    const input = "Meet at 123 Main St and the point 37.7749, -122.4194.";
    const result = redactSensitiveText(input);
    expect(result.redacted).toContain("[redacted-address-1]");
    expect(result.redacted).toContain("[redacted-coordinates-2]");
    expect(result.redactions).toHaveLength(2);
  });
});
