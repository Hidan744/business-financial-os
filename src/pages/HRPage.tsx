import { Fragment, useState } from 'react'
import { ChevronDown, ChevronUp, KeyRound, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { InfoTooltip } from '@/components/ui/tooltip'
import { useBusinessStore } from '@/store/businessStore'
import { calculateProjectedPayroll, calculateTotalPayroll } from '@/lib/finance/hr'
import { formatCurrency, cn } from '@/lib/utils'
import { PROTECTABLE_ROUTES } from '@/types/access'

export function HRPage() {
  const inputs = useBusinessStore((s) => s.financialInputs)
  const employees = useBusinessStore((s) => s.employees)
  const plannedHires = useBusinessStore((s) => s.plannedHires)
  const addEmployee = useBusinessStore((s) => s.addEmployee)
  const updateEmployee = useBusinessStore((s) => s.updateEmployee)
  const removeEmployee = useBusinessStore((s) => s.removeEmployee)
  const addPlannedHire = useBusinessStore((s) => s.addPlannedHire)
  const removePlannedHire = useBusinessStore((s) => s.removePlannedHire)
  const syncPayrollFromEmployees = useBusinessStore((s) => s.syncPayrollFromEmployees)

  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [salary, setSalary] = useState('')
  const [hireDate, setHireDate] = useState('')

  const [hireRole, setHireRole] = useState('')
  const [hireSalary, setHireSalary] = useState('')
  const [hirePeriod, setHirePeriod] = useState('')

  const [expandedAccessId, setExpandedAccessId] = useState<string | null>(null)

  if (!inputs) return null

  const totalPayroll = calculateTotalPayroll(employees)
  const projectedPayroll = calculateProjectedPayroll(employees, plannedHires)
  const payrollMismatch = totalPayroll !== inputs.payroll

  function submitEmployee() {
    const parsedSalary = Number(salary.replace(/\s/g, '').replace(',', '.'))
    if (!name.trim() || !role.trim() || !Number.isFinite(parsedSalary) || parsedSalary <= 0) return
    addEmployee({ name: name.trim(), role: role.trim(), salary: parsedSalary, hireDate: hireDate || new Date().toISOString().slice(0, 10) })
    setName('')
    setRole('')
    setSalary('')
    setHireDate('')
  }

  function toggleEmployeeRoute(employeeId: string, path: string) {
    const employee = employees.find((e) => e.id === employeeId)
    if (!employee) return
    const current = employee.allowedRoutes ?? []
    const next = current.includes(path) ? current.filter((p) => p !== path) : [...current, path]
    updateEmployee(employeeId, { allowedRoutes: next })
  }

  function submitPlannedHire() {
    const parsedSalary = Number(hireSalary.replace(/\s/g, '').replace(',', '.'))
    if (!hireRole.trim() || !Number.isFinite(parsedSalary) || parsedSalary <= 0 || !hirePeriod) return
    addPlannedHire({ role: hireRole.trim(), salary: parsedSalary, startPeriod: hirePeriod })
    setHireRole('')
    setHireSalary('')
    setHirePeriod('')
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Сотрудники</h1>
        <p className="text-sm text-ink-500 mt-1">Штат по сотрудникам и план найма — ФОТ считается снизу вверх.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-xs text-ink-400 mb-1">ФОТ по штату (сумма зарплат)</div>
          <div className="text-lg font-semibold text-ink-50">{formatCurrency(totalPayroll)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-xs text-ink-400 mb-1">
            ФОТ в Финансах
            <InfoTooltip>Значение поля «ФОТ» на странице Финансы. Если отличается от суммы по штату — обновите одним нажатием.</InfoTooltip>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className={`text-lg font-semibold ${payrollMismatch ? 'text-warning-500' : 'text-ink-50'}`}>{formatCurrency(inputs.payroll)}</div>
            {payrollMismatch && (
              <Button size="sm" variant="secondary" onClick={() => syncPayrollFromEmployees()}>
                Синхронизировать
              </Button>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Штат</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          {employees.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-500 border-b border-ink-800">
                    <th className="py-2 pr-4 font-medium">Имя</th>
                    <th className="py-2 pr-4 font-medium">Должность</th>
                    <th className="py-2 pr-4 font-medium text-right">Зарплата</th>
                    <th className="py-2 pr-4 font-medium">Дата найма</th>
                    <th className="py-2 pr-4 font-medium">Доступ</th>
                    <th className="py-2 pr-2 font-medium w-8" />
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => {
                    const isExpanded = expandedAccessId === e.id
                    const allowedCount = e.allowedRoutes?.length ?? 0
                    return (
                      <Fragment key={e.id}>
                        <tr className="border-b border-ink-800/60">
                          <td className="py-2.5 pr-4 text-ink-200">{e.name}</td>
                          <td className="py-2.5 pr-4 text-ink-300">{e.role}</td>
                          <td className="py-2.5 pr-4 text-right text-ink-100 tabular-nums">{formatCurrency(e.salary)}</td>
                          <td className="py-2.5 pr-4 text-ink-400">{e.hireDate}</td>
                          <td className="py-2.5 pr-4">
                            <button
                              onClick={() => setExpandedAccessId(isExpanded ? null : e.id)}
                              className={cn(
                                'flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border transition-colors',
                                e.pin
                                  ? 'border-brand-500/30 text-brand-400 bg-brand-500/10'
                                  : 'border-ink-700 text-ink-400 hover:text-ink-100',
                              )}
                            >
                              <KeyRound className="size-3.5" />
                              {e.pin ? `PIN · разд.: ${allowedCount}` : 'Не задан'}
                              {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                            </button>
                          </td>
                          <td className="py-2.5 pr-2 text-right">
                            <button
                              onClick={() => removeEmployee(e.id)}
                              className="text-ink-500 hover:text-negative-500 transition-colors"
                              aria-label={`Удалить ${e.name}`}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b border-ink-800/60 bg-ink-900/40">
                            <td colSpan={6} className="py-4 px-4">
                              <div className="max-w-sm mb-3">
                                <label className="text-xs text-ink-400 block mb-1">PIN-код сотрудника</label>
                                <Input
                                  inputMode="numeric"
                                  placeholder="Например, 4821"
                                  value={e.pin ?? ''}
                                  onChange={(ev) =>
                                    updateEmployee(e.id, { pin: ev.target.value.replace(/\D/g, '').slice(0, 6) || null })
                                  }
                                />
                              </div>
                              <label className="text-xs text-ink-400 block mb-1.5">Какие защищённые PIN-ом разделы открывает этот сотрудник</label>
                              <div className="grid sm:grid-cols-3 gap-2">
                                {PROTECTABLE_ROUTES.map((route) => (
                                  <label
                                    key={route.path}
                                    className="flex items-center gap-2 rounded-lg border border-ink-800 px-2.5 py-1.5 cursor-pointer hover:bg-ink-900"
                                  >
                                    <Checkbox
                                      checked={(e.allowedRoutes ?? []).includes(route.path)}
                                      onChange={() => toggleEmployeeRoute(e.id, route.path)}
                                    />
                                    <span className="text-xs text-ink-200">{route.label}</span>
                                  </label>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid sm:grid-cols-5 gap-2 items-end">
            <div className="sm:col-span-1">
              <label className="text-xs text-ink-400 block mb-1">Имя</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Анна" />
            </div>
            <div className="sm:col-span-1">
              <label className="text-xs text-ink-400 block mb-1">Должность</label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Бариста" />
            </div>
            <div className="sm:col-span-1">
              <label className="text-xs text-ink-400 block mb-1">Зарплата, ₽</label>
              <Input inputMode="decimal" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="70000" />
            </div>
            <div className="sm:col-span-1">
              <label className="text-xs text-ink-400 block mb-1">Дата найма</label>
              <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
            </div>
            <Button onClick={submitEmployee} className="sm:col-span-1">
              Добавить
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            План найма
            <InfoTooltip>Ещё не нанятые сотрудники, которых вы планируете нанять в будущем. Не входят в текущий ФОТ.</InfoTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          {plannedHires.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-500 border-b border-ink-800">
                    <th className="py-2 pr-4 font-medium">Должность</th>
                    <th className="py-2 pr-4 font-medium text-right">Зарплата</th>
                    <th className="py-2 pr-4 font-medium">С какого периода</th>
                    <th className="py-2 pr-2 font-medium w-8" />
                  </tr>
                </thead>
                <tbody>
                  {plannedHires.map((h) => (
                    <tr key={h.id} className="border-b border-ink-800/60">
                      <td className="py-2.5 pr-4 text-ink-200">{h.role}</td>
                      <td className="py-2.5 pr-4 text-right text-ink-100 tabular-nums">{formatCurrency(h.salary)}</td>
                      <td className="py-2.5 pr-4 text-ink-400">{h.startPeriod}</td>
                      <td className="py-2.5 pr-2 text-right">
                        <button
                          onClick={() => removePlannedHire(h.id)}
                          className="text-ink-500 hover:text-negative-500 transition-colors"
                          aria-label={`Удалить план найма: ${h.role}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid sm:grid-cols-4 gap-2 items-end">
            <div className="sm:col-span-1">
              <label className="text-xs text-ink-400 block mb-1">Должность</label>
              <Input value={hireRole} onChange={(e) => setHireRole(e.target.value)} placeholder="Бариста" />
            </div>
            <div className="sm:col-span-1">
              <label className="text-xs text-ink-400 block mb-1">Зарплата, ₽</label>
              <Input inputMode="decimal" value={hireSalary} onChange={(e) => setHireSalary(e.target.value)} placeholder="70000" />
            </div>
            <div className="sm:col-span-1">
              <label className="text-xs text-ink-400 block mb-1">С периода</label>
              <Input type="month" value={hirePeriod} onChange={(e) => setHirePeriod(e.target.value)} />
            </div>
            <Button onClick={submitPlannedHire} className="sm:col-span-1">
              Добавить
            </Button>
          </div>

          {plannedHires.length > 0 && (
            <div className="rounded-xl border border-ink-800 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-ink-400">Прогнозный ФОТ после всех наймов</span>
              <span className="text-sm font-semibold text-ink-50">{formatCurrency(projectedPayroll)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
