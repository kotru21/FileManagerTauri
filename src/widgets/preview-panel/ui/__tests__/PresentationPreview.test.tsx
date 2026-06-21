import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import PresentationPreview from "../PresentationPreview"

describe("PresentationPreview", () => {
  it("renders slide title and texts", () => {
    render(
      <PresentationPreview
        slides={[{ number: 1, title: "Intro", texts: ["Bullet one"] }]}
      />,
    )
    expect(screen.getByText("Intro")).toBeTruthy()
    expect(screen.getByText("Bullet one")).toBeTruthy()
  })
})
