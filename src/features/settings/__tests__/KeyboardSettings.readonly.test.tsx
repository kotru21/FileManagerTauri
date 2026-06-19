import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { KeyboardSettings } from "../ui/KeyboardSettings"

describe("KeyboardSettings", () => {
  it("shows read-only hint for shortcut keys", () => {
    render(<KeyboardSettings />)
    expect(screen.getByText(/комбинации клавиш пока нельзя изменить/i)).toBeInTheDocument()
  })
})
