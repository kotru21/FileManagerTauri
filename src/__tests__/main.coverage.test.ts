import { applyAppearanceToRoot } from "@/features/settings/hooks/useApplyAppearance"

vi.mock("@/features/settings/hooks/useApplyAppearance", () => ({
  applyAppearanceToRoot: vi.fn(),
}))

vi.mock("@/app", () => ({}))

describe("main bootstrap coverage", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it("applies saved appearance from localStorage", async () => {
    localStorage.setItem(
      "app-settings",
      JSON.stringify({
        state: {
          settings: {
            appearance: { theme: "dark", fontSize: "medium", accentColor: "#000" },
            behavior: { rememberLastPath: true },
          },
        },
      }),
    )

    await import("@/main")
    expect(applyAppearanceToRoot).toHaveBeenCalled()
  })

  it("clears navigation storage when rememberLastPath is false", async () => {
    localStorage.setItem("navigation-storage", "x")
    localStorage.setItem(
      "app-settings",
      JSON.stringify({
        settings: {
          behavior: { rememberLastPath: false },
        },
      }),
    )

    await import("@/main")
    expect(localStorage.getItem("navigation-storage")).toBeNull()
  })
})
