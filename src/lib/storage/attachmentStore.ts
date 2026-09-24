/**
 * Бинарные файлы вложений (отчёты сотрудников) хранятся отдельно от основного JSON-блока
 * состояния бизнеса — в IndexedDB браузера, а не в localStorage/Supabase JSONB. Причина:
 * основное состояние целиком перезаписывается при каждой мутации стора (см. save() в
 * localStorageRepository/supabaseFinanceRepository), и держать там файлы означало бы
 * пересериализовывать все вложения при любом изменении данных бизнеса.
 *
 * Ограничение: файлы живут только в этом браузере/устройстве, не синхронизируются между
 * участниками команды или устройствами — в EmployeeTask.attachments хранится только
 * метаданные (имя, размер, blobKey), сам файл нужно запрашивать здесь.
 *
 * Хранится ArrayBuffer + mimeType, а не Blob напрямую: часть сред (например fake-indexeddb
 * под jsdom в тестах) не клонирует Blob через structured clone надёжно, а ArrayBuffer — да.
 */
const DB_NAME = 'bfos-attachments'
const STORE_NAME = 'files'
const DB_VERSION = 1

interface StoredFile {
  buffer: ArrayBuffer
  mimeType: string
}

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Сохраняет файл под указанным ключом (обычно crypto.randomUUID()). */
export async function saveAttachmentBlob(key: string, blob: Blob): Promise<void> {
  if (!isIndexedDbAvailable()) throw new Error('IndexedDB недоступен в этом браузере')
  const buffer = await blob.arrayBuffer()
  const record: StoredFile = { buffer, mimeType: blob.type }
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(record, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

/** Возвращает файл по ключу или null, если его нет (например, IndexedDB очистили). */
export async function getAttachmentBlob(key: string): Promise<Blob | null> {
  if (!isIndexedDbAvailable()) return null
  const db = await openDb()
  try {
    const record = await new Promise<StoredFile | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).get(key)
      request.onsuccess = () => resolve(request.result as StoredFile | undefined)
      request.onerror = () => reject(request.error)
    })
    if (!record) return null
    return new Blob([record.buffer], { type: record.mimeType })
  } finally {
    db.close()
  }
}

export async function deleteAttachmentBlob(key: string): Promise<void> {
  if (!isIndexedDbAvailable()) return
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}
