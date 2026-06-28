// Pure validation for the public apply form. Extracted so it can be unit-tested.

import { ALLOWED_RESUME_EXTENSIONS, MAX_RESUME_BYTES } from "@/lib/api";

export type ApplyForm = { firstName: string; lastName: string; email: string };
export type ApplyField = "firstName" | "lastName" | "email" | "file";
export type ApplyErrors = Partial<Record<ApplyField, string>>;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A minimal file shape (a real File satisfies this). */
export type FileLike = { name: string; size: number };

export function computeApplyErrors(form: ApplyForm, file: FileLike | null): ApplyErrors {
  const errors: ApplyErrors = {};
  if (!form.firstName.trim()) errors.firstName = "Please enter your first name.";
  if (!form.lastName.trim()) errors.lastName = "Please enter your last name.";
  if (!form.email.trim()) errors.email = "Please enter your email.";
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = "Please enter a valid email address.";
  if (!file) errors.file = "Please attach your resume or CV.";
  return errors;
}

/** Validate a chosen resume file; returns an error message or null. */
export function validateResumeFile(file: FileLike): string | null {
  const lower = file.name.toLowerCase();
  if (!ALLOWED_RESUME_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return "Please upload a PDF, DOC, or DOCX file.";
  }
  if (file.size > MAX_RESUME_BYTES) {
    return "File must be 4 MB or smaller.";
  }
  return null;
}
