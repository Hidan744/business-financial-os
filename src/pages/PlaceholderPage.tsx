export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center text-ink-500">
      <p className="text-sm">Раздел «{title}» в разработке</p>
    </div>
  )
}
