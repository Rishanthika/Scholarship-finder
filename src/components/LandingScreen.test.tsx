// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LandingScreen } from "./LandingScreen";
import type { LeadInfo } from "@/types";

/**
 * Same rationale as the admin login test: proves the actual, current
 * code correctly wires the "Start Finding My Scholarships" button to
 * validation + onStart, using jsdom's real DOM event dispatch rather
 * than relying on code review alone. This screen uses a plain onClick
 * button (no <form> at all), so the native-GET-submission failure mode
 * that applies to the admin login page structurally cannot apply here
 * — this test instead checks the more relevant risk for this screen:
 * does a valid submission actually call onStart, and does an invalid
 * one correctly block it with visible errors instead of silently doing
 * nothing?
 */

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt as string} />;
  },
}));

const emptyLead: LeadInfo = { name: "", phone: "", email: "" };

describe("LandingScreen — does the Start button actually call onStart?", () => {
  afterEach(() => {
    cleanup();
  });

  it("calls onStart when all three fields are valid", () => {
    const onStart = vi.fn();
    const onLeadChange = vi.fn();
    const { rerender } = render(<LandingScreen lead={emptyLead} onLeadChange={onLeadChange} onStart={onStart} />);

    // Simulate the parent updating `lead` as the controlled inputs change
    // (this component is fully controlled — see LandingScreenProps).
    const validLead: LeadInfo = { name: "Ananya Rao", phone: "+91 9876543210", email: "ananya@example.com" };
    rerender(<LandingScreen lead={validLead} onLeadChange={onLeadChange} onStart={onStart} />);

    fireEvent.click(screen.getByRole("button", { name: /start finding my scholarships/i }));

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onStart and shows inline errors when fields are empty", () => {
    const onStart = vi.fn();
    render(<LandingScreen lead={emptyLead} onLeadChange={vi.fn()} onStart={onStart} />);

    fireEvent.click(screen.getByRole("button", { name: /start finding my scholarships/i }));

    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByText("Please enter your full name.")).toBeInTheDocument();
    expect(screen.getByText("Please enter your phone number.")).toBeInTheDocument();
    expect(screen.getByText("Please enter your email address.")).toBeInTheDocument();
  });

  it("does NOT call onStart when the phone number is invalid, even if name/email are valid", () => {
    const onStart = vi.fn();
    const invalidPhoneLead: LeadInfo = { name: "Ananya Rao", phone: "123", email: "ananya@example.com" };
    render(<LandingScreen lead={invalidPhoneLead} onLeadChange={vi.fn()} onStart={onStart} />);

    fireEvent.click(screen.getByRole("button", { name: /start finding my scholarships/i }));

    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByText("Please enter a valid phone number.")).toBeInTheDocument();
  });

  it("onChange handlers correctly call onLeadChange with an updated field (typing actually updates state)", () => {
    const onLeadChange = vi.fn();
    render(<LandingScreen lead={emptyLead} onLeadChange={onLeadChange} onStart={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Ananya Rao"), { target: { value: "New Name" } });

    expect(onLeadChange).toHaveBeenCalledWith({ ...emptyLead, name: "New Name" });
  });
});
