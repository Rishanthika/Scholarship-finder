import { describe, it, expect } from "vitest";
import { validateLeadInfo, isLeadInfoValid } from "./leadValidation";

describe("Lead info validation", () => {
  it("rejects empty name, phone, and email", () => {
    const errors = validateLeadInfo({ name: "", phone: "", email: "" });
    expect(errors.name).toBeDefined();
    expect(errors.phone).toBeDefined();
    expect(errors.email).toBeDefined();
  });

  it("rejects a whitespace-only name", () => {
    expect(validateLeadInfo({ name: "   ", phone: "9876543210", email: "a@b.com" }).name).toBeDefined();
  });

  it("rejects a name with no letters", () => {
    expect(validateLeadInfo({ name: "1234", phone: "9876543210", email: "a@b.com" }).name).toBeDefined();
  });

  it("accepts a valid Indian +91 number", () => {
    expect(validateLeadInfo({ name: "Priya Sharma", phone: "+91 98765 43210", email: "priya@example.com" }).phone).toBeUndefined();
  });

  it("accepts a plain 10-digit Indian number without country code", () => {
    expect(validateLeadInfo({ name: "Priya Sharma", phone: "9876543210", email: "priya@example.com" }).phone).toBeUndefined();
  });

  it("accepts reasonable international formats (US, UK)", () => {
    expect(validateLeadInfo({ name: "John Doe", phone: "+1 (415) 555-0132", email: "john@example.com" }).phone).toBeUndefined();
    expect(validateLeadInfo({ name: "Jane Doe", phone: "+44 20 7946 0958", email: "jane@example.com" }).phone).toBeUndefined();
  });

  it("rejects an obviously invalid phone (too short, or letters)", () => {
    expect(validateLeadInfo({ name: "A B", phone: "123", email: "a@b.com" }).phone).toBeDefined();
    expect(validateLeadInfo({ name: "A B", phone: "phone-number", email: "a@b.com" }).phone).toBeDefined();
  });

  it("rejects a malformed email", () => {
    expect(validateLeadInfo({ name: "A B", phone: "9876543210", email: "not-an-email" }).email).toBeDefined();
  });

  it("accepts a fully valid lead", () => {
    const lead = { name: "Ananya Rao", phone: "+91 9876543210", email: "ananya.rao@example.com" };
    expect(isLeadInfoValid(lead)).toBe(true);
    expect(validateLeadInfo(lead)).toEqual({});
  });
});
