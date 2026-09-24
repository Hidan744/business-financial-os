import { useRef, useState } from 'react'
import { CheckCircle2, Circle, Paperclip, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InfoTooltip } from '@/components/ui/tooltip'
import { calculateEmployeeWorkload } from '@/lib/finance/hr'
import { getAttachmentBlob, saveAttachmentBlob } from '@/lib/storage/attachmentStore'
import { generateId } from '@/lib/id'
import { cn } from '@/lib/utils'
import type { Employee, EmployeeTask } from '@/types/hr'

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

interface EmployeeTaskPanelProps {
  employee: Employee
  tasks: EmployeeTask[]
  /** Может ставить новые задачи и удалять их — статус и вложения доступны всем (владельцу и самому сотруднику). */
  canManage: boolean
  addTask: (task: { employeeId: string; title: string; dueDate?: string }) => void
  removeTask: (id: string) => void
  setTaskStatus: (id: string, status: EmployeeTask['status']) => void
  addAttachment: (taskId: string, attachment: { blobKey: string; name: string; mimeType: string; sizeBytes: number; uploadedAt: string }) => void
  removeAttachment: (taskId: string, attachmentId: string) => void
}

export function EmployeeTaskPanel({
  employee,
  tasks,
  canManage,
  addTask,
  removeTask,
  setTaskStatus,
  addAttachment,
  removeAttachment,
}: EmployeeTaskPanelProps) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const own = tasks.filter((t) => t.employeeId === employee.id)
  const open = own.filter((t) => t.status === 'open').sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
  const done = own.filter((t) => t.status === 'done').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  const workload = calculateEmployeeWorkload(employee.id, tasks)

  function submitTask() {
    if (!title.trim()) return
    addTask({ employeeId: employee.id, title: title.trim(), dueDate: dueDate || undefined })
    setTitle('')
    setDueDate('')
  }

  async function handleFileChange(taskId: string, files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setUploadError(null)
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setUploadError(`Файл слишком большой (${formatFileSize(file.size)}). Максимум ${formatFileSize(MAX_ATTACHMENT_BYTES)}.`)
      return
    }
    setUploadingTaskId(taskId)
    try {
      const blobKey = generateId('blob')
      await saveAttachmentBlob(blobKey, file)
      addAttachment(taskId, {
        blobKey,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
      })
    } catch {
      setUploadError('Не удалось сохранить файл в этом браузере.')
    } finally {
      setUploadingTaskId(null)
      const input = fileInputRefs.current[taskId]
      if (input) input.value = ''
    }
  }

  async function downloadAttachment(name: string, blobKey: string) {
    const blob = await getAttachmentBlob(blobKey)
    if (!blob) {
      setUploadError('Файл не найден в этом браузере — возможно, он был прикреплён на другом устройстве.')
      return
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <WorkloadBadge label="Открытых задач" value={workload.openCount} tone="neutral" />
        <WorkloadBadge label="Просрочено" value={workload.overdueCount} tone={workload.overdueCount > 0 ? 'negative' : 'neutral'} />
        <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border border-ink-700 text-ink-300">
          Своевременность
          <InfoTooltip>Доля выполненных задач со сроком, закрытых не позже dueDate. Задачи без срока в расчёт не входят.</InfoTooltip>
          <span className="font-semibold text-ink-100">{workload.efficiencyPct === null ? '—' : `${workload.efficiencyPct}%`}</span>
        </div>
      </div>

      {uploadError && <p className="text-xs text-negative-500">{uploadError}</p>}

      <div className="space-y-2">
        {open.length === 0 && done.length === 0 && <p className="text-sm text-ink-500">Задач пока нет.</p>}
        {[...open, ...done].map((task) => {
          const isOverdue = task.status === 'open' && task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10)
          return (
            <div key={task.id} className="rounded-lg border border-ink-800 px-3 py-2.5">
              <div className="flex items-start gap-2.5">
                <button
                  onClick={() => setTaskStatus(task.id, task.status === 'open' ? 'done' : 'open')}
                  aria-label={task.status === 'open' ? 'Отметить выполненной' : 'Вернуть в работу'}
                  className={cn('mt-0.5 shrink-0', task.status === 'done' ? 'text-positive-500' : 'text-ink-500 hover:text-ink-200')}
                >
                  {task.status === 'done' ? <CheckCircle2 className="size-4.5" /> : <Circle className="size-4.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className={cn('text-sm', task.status === 'done' ? 'text-ink-500 line-through' : 'text-ink-100')}>{task.title}</div>
                  {task.description && <div className="text-xs text-ink-500 mt-0.5">{task.description}</div>}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    {task.dueDate && (
                      <span className={cn('text-xs', isOverdue ? 'text-negative-500 font-medium' : 'text-ink-500')}>
                        Срок: {task.dueDate}
                        {isOverdue && ' · просрочено'}
                      </span>
                    )}
                    {task.completedAt && <span className="text-xs text-positive-500">Выполнено: {task.completedAt.slice(0, 10)}</span>}
                  </div>

                  {task.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {task.attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-2 text-xs text-ink-300">
                          <Paperclip className="size-3 shrink-0 text-ink-500" />
                          <button onClick={() => downloadAttachment(att.name, att.blobKey)} className="truncate hover:text-brand-400 underline underline-offset-2">
                            {att.name}
                          </button>
                          <span className="text-ink-600 shrink-0">{formatFileSize(att.sizeBytes)}</span>
                          <button
                            onClick={() => removeAttachment(task.id, att.id)}
                            className="text-ink-600 hover:text-negative-500 shrink-0"
                            aria-label={`Удалить файл ${att.name}`}
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-2">
                    <input
                      ref={(el) => {
                        fileInputRefs.current[task.id] = el
                      }}
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileChange(task.id, e.target.files)}
                    />
                    <button
                      onClick={() => fileInputRefs.current[task.id]?.click()}
                      disabled={uploadingTaskId === task.id}
                      className="flex items-center gap-1 text-xs text-ink-400 hover:text-ink-100 disabled:opacity-50"
                    >
                      <Paperclip className="size-3" />
                      {uploadingTaskId === task.id ? 'Загрузка…' : 'Прикрепить отчёт'}
                    </button>
                  </div>
                </div>
                {canManage && (
                  <button
                    onClick={() => removeTask(task.id)}
                    className="text-ink-500 hover:text-negative-500 shrink-0"
                    aria-label={`Удалить задачу ${task.title}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {canManage && (
        <div className="grid sm:grid-cols-4 gap-2 items-end pt-1">
          <div className="sm:col-span-2">
            <label className="text-xs text-ink-400 block mb-1">Новая задача</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, сверить кассу" />
          </div>
          <div className="sm:col-span-1">
            <label className="text-xs text-ink-400 block mb-1">Срок</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <Button onClick={submitTask} className="sm:col-span-1" variant="secondary">
            <Plus className="size-3.5" /> Добавить
          </Button>
        </div>
      )}
    </div>
  )
}

function WorkloadBadge({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'negative' }) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border',
        tone === 'negative' && value > 0 ? 'border-negative-500/30 text-negative-400 bg-negative-500/10' : 'border-ink-700 text-ink-300',
      )}
    >
      {label}
      <span className="font-semibold">{value}</span>
    </div>
  )
}
