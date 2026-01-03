/// <reference types="vitest" />
import { fireEvent, render, screen } from "@testing-library/react"
import { expect, it, vi } from "vitest"
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

it("opens Create submenu on click", async () => {
  render(
    <FileContextMenu
      selectedPaths={[]}
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

  fireEvent.contextMenu(screen.getByText("Trigger"))

  const create = await screen.findByText("Создать")
  fireEvent.click(create)

  const folderItem = await screen.findByText("Папку")
  const fileItem = await screen.findByText("Файл")

  expect(folderItem).toBeTruthy()
  expect(fileItem).toBeTruthy()

  // Regression guard: the submenu should not be clipped by the main menu container
  // (ContextMenuContent has overflow-hidden). Rendering sub content in a Portal
  // keeps it visible.
  const mainMenu = document.querySelector(".w-56")
  expect(mainMenu).toBeTruthy()
  expect(mainMenu?.contains(folderItem)).toBe(false)
})

it("clicking Create → File calls onNewFile", async () => {
  const onNewFile = vi.fn()

  render(
    <FileContextMenu
      selectedPaths={[]}
      onCopy={() => {}}
      onCut={() => {}}
      onPaste={() => {}}
      onDelete={() => {}}
      onRename={() => {}}
      onNewFolder={() => {}}
      onNewFile={onNewFile}
      onRefresh={() => {}}
      canPaste={false}
    >
      <div>Trigger</div>
    </FileContextMenu>,
  )

  fireEvent.contextMenu(screen.getByText("Trigger"))

  fireEvent.click(await screen.findByText("Создать"))
  fireEvent.click(await screen.findByText("Файл"))

  expect(onNewFile).toHaveBeenCalledTimes(1)
})
