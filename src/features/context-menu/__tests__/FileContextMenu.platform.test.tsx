/// <reference types="vitest" />
import { fireEvent, render, screen } from "@testing-library/react"
import { expect, it } from "vitest"
import { FileContextMenu } from "@/features/context-menu/ui/FileContextMenu"

it("shows Open in Explorer when context menu is opened", async () => {
  render(
    <FileContextMenu
      selectedPaths={["/a"]}
      onCopy={() => {}}
      onCut={() => {}}
      onPaste={() => {}}
      onDelete={() => {}}
      onRename={() => {}}
      onNewFolder={() => {}}
      onNewFile={() => {}}
      onRefresh={() => {}}
      canPaste={false}
    >
      <div>Trigger</div>
    </FileContextMenu>,
  )

  // open the menu
  const trigger = screen.getByText("Trigger")
  fireEvent.contextMenu(trigger)

  expect(await screen.findByText("Открыть в проводнике")).toBeTruthy()
})
