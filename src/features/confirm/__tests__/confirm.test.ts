import { act, renderHook } from '@testing-library/react'
import { useConfirmStore } from '../model/store'

describe('confirm store', () => {
  it('resolves true when confirmed, false when cancelled', async () => {
    const { result } = renderHook(() => useConfirmStore())

    // Open confirm and resolve via confirm()
    const p = act(() => useConfirmStore.getState().open('T', 'M'))

    // Confirm should resolve true
    act(() => useConfirmStore.getState().confirm())

    await expect(p).resolves.toBe(true)

    // Open again and cancel
    const p2 = act(() => useConfirmStore.getState().open('T2', 'M2'))
    act(() => useConfirmStore.getState().cancel())
    await expect(p2).resolves.toBe(false)
  })
})
