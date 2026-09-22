import { useEffect, useState } from 'react'
import { Mail, Trash2, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { InfoTooltip } from '@/components/ui/tooltip'
import { supabaseFinanceRepository } from '@/lib/storage/supabaseFinanceRepository'
import { ALL_TEAM_DOMAINS, TEAM_DOMAIN_LABELS, type BusinessMember, type PendingInvite, type TeamDomain } from '@/types/teamAccess'

/**
 * Только для владельца Supabase-бизнеса (SettingsPage сама решает, когда её показывать).
 * Приглашённый сотрудник входит под своим email/паролем на обычной странице /auth —
 * отдельного экрана регистрации для команды нет, это тот же вход, что и у владельца.
 */
export function TeamAccessPanel({ businessId }: { businessId: string }) {
  const [members, setMembers] = useState<BusinessMember[]>([])
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)

  const [email, setEmail] = useState('')
  const [label, setLabel] = useState('')
  const [domains, setDomains] = useState<TeamDomain[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    const [m, i] = await Promise.all([
      supabaseFinanceRepository.listMembers(businessId),
      supabaseFinanceRepository.listPendingInvites(businessId),
    ])
    setMembers(m)
    setInvites(i)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  function toggleDomain(d: TeamDomain) {
    setDomains((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  async function submitInvite() {
    const trimmed = email.trim()
    if (!trimmed || domains.length === 0) {
      setMessage('Укажите email и хотя бы один раздел доступа.')
      return
    }
    setSubmitting(true)
    setMessage(null)
    const result = await supabaseFinanceRepository.inviteMember(businessId, trimmed, domains, label.trim() || null)
    setSubmitting(false)
    if (result === 'linked') {
      setMessage(`${trimmed} уже зарегистрирован(а) — доступ выдан сразу.`)
    } else if (result === 'pending') {
      setMessage(`Приглашение отправлено. ${trimmed} получит доступ, как только зарегистрируется на странице входа с этим email.`)
    } else {
      setMessage('Не удалось создать приглашение — проверьте email и попробуйте ещё раз.')
    }
    if (result) {
      setEmail('')
      setLabel('')
      setDomains([])
      await refresh()
    }
  }

  async function handleUpdateMemberDomains(userId: string, nextDomains: TeamDomain[]) {
    await supabaseFinanceRepository.updateMemberAccess(businessId, userId, nextDomains)
    await refresh()
  }

  async function handleRemoveMember(userId: string) {
    if (!window.confirm('Убрать доступ этому сотруднику?')) return
    await supabaseFinanceRepository.removeMember(businessId, userId)
    await refresh()
  }

  async function handleRevokeInvite(inviteId: string) {
    await supabaseFinanceRepository.revokeInvite(inviteId)
    await refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Users className="size-4" /> Команда
          <InfoTooltip>
            Каждый сотрудник входит под своим email — доступ проверяется на сервере, и сотрудник физически не
            получает в браузер данные разделов, которые ему не открыты (в отличие от старого PIN, который просто
            прятал UI). Настройки всегда доступны только вам.
          </InfoTooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 space-y-5">
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="invite-email">Email сотрудника</Label>
              <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="invite-label">Имя/должность (опционально)</Label>
              <Input id="invite-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Например, Бухгалтер" className="mt-2" />
            </div>
          </div>
          <div>
            <Label>Какие разделы открыть</Label>
            <div className="mt-2 grid sm:grid-cols-2 gap-2">
              {ALL_TEAM_DOMAINS.map((d) => (
                <label key={d} className="flex items-center gap-2.5 rounded-lg border border-ink-800 px-3 py-2 cursor-pointer hover:bg-ink-900">
                  <Checkbox checked={domains.includes(d)} onChange={() => toggleDomain(d)} />
                  <span className="text-sm text-ink-200">{TEAM_DOMAIN_LABELS[d]}</span>
                </label>
              ))}
            </div>
          </div>
          <Button size="sm" onClick={submitInvite} disabled={submitting}>
            <Mail className="size-4" /> {submitting ? 'Отправляем…' : 'Пригласить'}
          </Button>
          {message && <p className="text-xs text-ink-400">{message}</p>}
        </div>

        {!loading && members.length > 0 && (
          <div className="pt-2 border-t border-ink-800">
            <div className="text-sm text-ink-300 mb-2">Активные участники</div>
            <div className="space-y-2">
              {members.map((m) => (
                <MemberRow key={m.userId} member={m} onUpdate={handleUpdateMemberDomains} onRemove={handleRemoveMember} />
              ))}
            </div>
          </div>
        )}

        {!loading && invites.length > 0 && (
          <div className="pt-2 border-t border-ink-800">
            <div className="text-sm text-ink-300 mb-2">Ожидают регистрации</div>
            <div className="space-y-2">
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border border-ink-800 px-3 py-2.5">
                  <div>
                    <div className="text-sm text-ink-200">{inv.email}</div>
                    <div className="text-xs text-ink-500 mt-0.5">{inv.allowedDomains.map((d) => TEAM_DOMAIN_LABELS[d]).join(', ')}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRevokeInvite(inv.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MemberRow({
  member,
  onUpdate,
  onRemove,
}: {
  member: BusinessMember
  onUpdate: (userId: string, domains: TeamDomain[]) => void
  onRemove: (userId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-ink-800">
      <div className="flex items-center justify-between px-3 py-2.5">
        <button className="text-left flex-1" onClick={() => setExpanded((v) => !v)}>
          <div className="text-sm text-ink-200">{member.label || member.userId}</div>
          <div className="text-xs text-ink-500 mt-0.5">{member.allowedDomains.map((d) => TEAM_DOMAIN_LABELS[d]).join(', ') || 'Нет доступа ни к чему'}</div>
        </button>
        <Button variant="ghost" size="sm" onClick={() => onRemove(member.userId)}>
          <Trash2 className="size-4" />
        </Button>
      </div>
      {expanded && (
        <div className="px-3 pb-3 grid sm:grid-cols-2 gap-2">
          {ALL_TEAM_DOMAINS.map((d) => (
            <label key={d} className="flex items-center gap-2.5 rounded-lg border border-ink-800 px-3 py-2 cursor-pointer hover:bg-ink-900">
              <Checkbox
                checked={member.allowedDomains.includes(d)}
                onChange={() =>
                  onUpdate(
                    member.userId,
                    member.allowedDomains.includes(d) ? member.allowedDomains.filter((x) => x !== d) : [...member.allowedDomains, d],
                  )
                }
              />
              <span className="text-sm text-ink-200">{TEAM_DOMAIN_LABELS[d]}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
