import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { deleteAttachmentBlob, getAttachmentBlob, saveAttachmentBlob } from './attachmentStore'

describe('attachmentStore', () => {
  it('saves and reads back a blob by key', async () => {
    const blob = new Blob(['hello world'], { type: 'text/plain' })
    await saveAttachmentBlob('key1', blob)
    const back = await getAttachmentBlob('key1')
    expect(back).not.toBeNull()
    expect(await back!.text()).toBe('hello world')
  })

  it('returns null for a missing key', async () => {
    const back = await getAttachmentBlob('does-not-exist')
    expect(back).toBeNull()
  })

  it('overwrites a blob saved under the same key', async () => {
    await saveAttachmentBlob('key2', new Blob(['v1']))
    await saveAttachmentBlob('key2', new Blob(['v2']))
    const back = await getAttachmentBlob('key2')
    expect(await back!.text()).toBe('v2')
  })

  it('deletes a blob so it can no longer be read', async () => {
    await saveAttachmentBlob('key3', new Blob(['bye']))
    await deleteAttachmentBlob('key3')
    const back = await getAttachmentBlob('key3')
    expect(back).toBeNull()
  })

  it('deleting a missing key does not throw', async () => {
    await expect(deleteAttachmentBlob('never-existed')).resolves.toBeUndefined()
  })
})
