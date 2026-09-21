export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2.4 A9.6 9.6 0 1 1 3.68 7.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M3.68 7.2 L3.68 2.4 M3.68 7.2 L8.4 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x="12" y="15.4" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="10" fontWeight="800" fill="currentColor">
        ₽
      </text>
    </svg>
  )
}
