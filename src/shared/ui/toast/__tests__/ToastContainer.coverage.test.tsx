/// <reference types="vitest" />

import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { act } from "react"
import { useToastStore } from "../store"
import { ToastContainer } from "../ToastContainer"

describe("ToastContainer coverage", () => {
  beforeEach(() => {
    act(() => useToastStore.getState().clearAll())
  })

  it("renders nothing when there are no toasts", () => {
    const { container } = render(<ToastContainer />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders toasts and dismisses on close click", () => {
    act(() => {
      useToastStore.getState().addToast({ message: "Saved", type: "success" })
    })

    render(<ToastContainer />)

    expect(screen.getByText("Saved")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button"))
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
})
