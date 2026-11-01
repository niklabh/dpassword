import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The accepted requirement is documentation-only: a README must exist in the
 * project code and describe the app. This reads the real file from disk so the
 * assertion fails if the README is removed or stops describing the app.
 *
 * Vitest runs with the frontend package as its working directory, so the
 * project README sits two levels up at `app/README.md`.
 */
const README_PATH = resolve(process.cwd(), "../../README.md");

function readReadme(): string {
  return readFileSync(README_PATH, "utf8");
}

describe("project README", () => {
  it("exists in the project code", () => {
    expect(() => readReadme()).not.toThrow();
    expect(readReadme().trim().length).toBeGreaterThan(0);
  });

  it("describes the app and its documented identity", () => {
    const readme = readReadme();
    expect(readme).toMatch(/^#\s+dPassword Manager/m);
    expect(readme).toMatch(/zero-knowledge/i);
    expect(readme).toMatch(/Internet Identity/);
    expect(readme).toMatch(/Secure Notes/);
    expect(readme).toMatch(/Vault Passwords/);
  });

  it("documents the architecture and security model", () => {
    const readme = readReadme();
    expect(readme).toMatch(/##\s+Architecture/);
    expect(readme).toMatch(/Motoko/);
    expect(readme).toMatch(/##\s+Security Model/);
    expect(readme).toMatch(/ciphertext/i);
  });
});
