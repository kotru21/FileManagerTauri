import "@testing-library/jest-dom/vitest"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Skeleton } from "../index"

describe("Skeleton", () => {
  it("renders pulse placeholder", () => {
    const { container } = render(<Skeleton className="h-4 w-full" />)
    expect(container.firstChild).toHaveClass("animate-pulse")
  })
})
