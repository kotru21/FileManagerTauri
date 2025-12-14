import { render, screen } from "@testing-library/react";
import { DriveItem } from "@/entities/drive";

function makeDrive(overrides = {}) {
  return {
    name: "C:",
    path: "C:\\",
    total_space: 0,
    free_space: 0,
    drive_type: "local",
    label: null,
    ...overrides,
  };
}

describe("DriveItem", () => {
  test("shows label and short path when label is present", () => {
    const drive = makeDrive({ label: "System" });
    render(<DriveItem drive={drive} onSelect={() => {}} isSelected={false} />);
    expect(screen.getByText(/System \(C:/)).toBeInTheDocument();
  });

  test("shows path basename when label is missing", () => {
    const drive = makeDrive({ label: null });
    render(<DriveItem drive={drive} onSelect={() => {}} isSelected={false} />);
    expect(screen.getByText("C:")).toBeInTheDocument();
    // When no label is present and the drive is root, we should not show redundant full path as a subline
    expect(screen.queryByText(/C:\\$/)).not.toBeInTheDocument();
  });

  test("shows full path when drive is a non-root mount", () => {
    const drive = makeDrive({ label: null, path: "C:\\mount\\sub" });
    render(<DriveItem drive={drive} onSelect={() => {}} isSelected={false} />);
    expect(screen.getByText("sub")).toBeInTheDocument();
    expect(screen.getByText(drive.path)).toBeInTheDocument();
  });
});
