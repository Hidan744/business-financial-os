import { useRef, type MouseEvent } from 'react'

// Точки сети — реальные модули продукта, а не абстрактные подписи.
const NODES = [
  { label: 'Cash Flow', x: 4, y: 66 },
  { label: 'Прогноз', x: 16, y: 26 },
  { label: 'AI CFO', x: 84, y: 28 },
  { label: 'Налоги', x: 97, y: 68 },
  { label: 'P&L', x: 38, y: 92 },
  { label: 'Склад', x: 68, y: 92 },
]
const HUB = { x: 50, y: 50 }

export function NetworkGraphic() {
  const ref = useRef<HTMLDivElement>(null)

  function handleMove(e: MouseEvent<HTMLDivElement>) {
    ref.current?.querySelectorAll<HTMLElement>('[data-node]').forEach((el) => {
      const r = el.getBoundingClientRect()
      const dist = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2))
      el.classList.toggle('near', dist < 90)
    })
  }

  function handleLeave() {
    ref.current?.querySelectorAll('[data-node]').forEach((el) => el.classList.remove('near'))
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="relative h-[200px] sm:h-[260px] mt-2"
      aria-hidden="true"
    >
      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {NODES.map((n) => (
          <line
            key={n.label}
            x1={HUB.x}
            y1={HUB.y}
            x2={n.x}
            y2={n.y}
            vectorEffect="non-scaling-stroke"
            className="stroke-ink-700"
            strokeWidth="1"
          />
        ))}
        <circle cx={HUB.x} cy={HUB.y} r="1" className="fill-ink-700" />
        {NODES.map((n) => (
          <circle key={n.label} cx={n.x} cy={n.y} r="1.4" className="fill-aurora-amber-soft" />
        ))}
      </svg>
      {NODES.map((n) => (
        <span
          key={n.label}
          data-node
          className="eclipse-node absolute -translate-x-1/2 -translate-y-1/2 text-[11px] font-medium text-ink-300 bg-white/[0.03] border border-ink-700 rounded-full px-3 py-1.5 whitespace-nowrap backdrop-blur-sm"
          style={{ left: `${n.x}%`, top: `${n.y}%` }}
        >
          {n.label}
        </span>
      ))}
    </div>
  )
}
