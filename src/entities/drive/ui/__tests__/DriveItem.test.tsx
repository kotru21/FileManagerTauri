import { fireEvent, render, screen } from "@testing-library/react"
import type { DriveInfo } from "@/shared/api/tauri"
import { DriveItem } from "../DriveItem"

const makeDrive = (overrides: Partial<DriveInfo> = {}): DriveInfo => ({
  name: "C:",
  path: "C:\\",
  total_space: 500_000_000_000,
  free_space: 200_000_000_000,
  drive_type: "Fixed",
  ...overrides,
})

describe("DriveItem", () => {
  it("renders drive name text", () => {
    render(<DriveItem drive={makeDrive({ name: "D:" })} isSelected={false} onSelect={() => {}} />)

    expect(screen.getByText("D:")).toBeTruthy()
  })

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn()
    render(<DriveItem drive={makeDrive()} isSelected={false} onSelect={onSelect} />)

    fireEvent.click(screen.getByRole("button"))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it("has bg-accent class when isSelected is true", () => {
    render(<DriveItem drive={makeDrive()} isSelected={true} onSelect={() => {}} />)

    const button = screen.getByRole("button")
    expect(button.classList.contains("bg-accent")).toBe(true)
  })

  it("has text-muted-foreground class when isSelected is false", () => {
    render(<DriveItem drive={makeDrive()} isSelected={false} onSelect={() => {}} />)

    const button = screen.getByRole("button")
    expect(button.classList.contains("text-muted-foreground")).toBe(true)
  })

  it("renders as a button element", () => {
    render(<DriveItem drive={makeDrive()} isSelected={false} onSelect={() => {}} />)

    const button = screen.getByRole("button")
    expect(button.tagName).toBe("BUTTON")
    expect(button.getAttribute("type")).toBe("button")
  })
})
