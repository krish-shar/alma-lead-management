import { describe, expect, it } from "vitest";
import { computeApplyErrors, validateResumeFile } from "@/lib/validation";

describe("computeApplyErrors", () => {
  it("requires every field when empty", () => {
    const e = computeApplyErrors({ firstName: "", lastName: "", email: "" }, null);
    expect(e.firstName).toBeDefined();
    expect(e.lastName).toBeDefined();
    expect(e.email).toBeDefined();
    expect(e.file).toBeDefined();
  });

  it("rejects a malformed email", () => {
    const e = computeApplyErrors(
      { firstName: "A", lastName: "B", email: "not-an-email" },
      { name: "cv.pdf", size: 10 },
    );
    expect(e.email).toBeDefined();
  });

  it("accepts a fully valid form", () => {
    const e = computeApplyErrors(
      { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" },
      { name: "cv.pdf", size: 1000 },
    );
    expect(e).toEqual({});
  });

  it("treats whitespace-only names as empty", () => {
    const e = computeApplyErrors({ firstName: "   ", lastName: "B", email: "a@b.com" }, { name: "cv.pdf", size: 1 });
    expect(e.firstName).toBeDefined();
  });
});

describe("validateResumeFile", () => {
  it("rejects an unsupported extension", () => {
    expect(validateResumeFile({ name: "resume.exe", size: 10 })).toMatch(/PDF/);
  });

  it("rejects a file over 4 MB", () => {
    expect(validateResumeFile({ name: "resume.pdf", size: 5 * 1024 * 1024 })).toMatch(/smaller/);
  });

  it("accepts a small pdf/doc/docx", () => {
    expect(validateResumeFile({ name: "resume.pdf", size: 1000 })).toBeNull();
    expect(validateResumeFile({ name: "resume.docx", size: 1000 })).toBeNull();
    expect(validateResumeFile({ name: "RESUME.DOC", size: 1000 })).toBeNull();
  });
});
