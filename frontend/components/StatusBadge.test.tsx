import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "@/components/StatusBadge";

describe("StatusBadge", () => {
  it("renders the Pending label for PENDING", () => {
    render(<StatusBadge state="PENDING" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders the Reached out label for REACHED_OUT", () => {
    render(<StatusBadge state="REACHED_OUT" />);
    expect(screen.getByText("Reached out")).toBeInTheDocument();
  });

  it("supports a custom pending label (used on the detail page)", () => {
    render(<StatusBadge state="PENDING" pendingLabel="Pending outreach" />);
    expect(screen.getByText("Pending outreach")).toBeInTheDocument();
  });
});
