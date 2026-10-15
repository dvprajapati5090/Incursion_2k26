import { describe, expect, it } from "vitest";
import { parseClientCsv } from "../src/lib/clientImport.js";

describe("browser-side CSV import", () => {
  it("maps common header aliases, groups rows, and retains extra fields", () => {
    const result = parseClientCsv('Team Number,Name,Email,Theme\nT1,Alice,ALICE@example.com,"Climate, health"\nT1,Bob,,Climate');
    expect(result.teams[0].teamId).toBe("T1");
    expect(result.teams[0].members).toHaveLength(2);
    expect(result.teams[0].members[0].email).toBe("alice@example.com");
    expect(result.teams[0].fields.theme).toBe("Climate, health");
  });

  it("reports a missing team ID mapping instead of silently importing zero teams", () => {
    expect(() => parseClientCsv("Name,Email\nAlice,a@example.com")).toThrow(/team_id/);
  });
});
