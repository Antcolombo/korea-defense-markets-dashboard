export function CatalystList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-semibold text-ink">{title}</p>
      <ul className="mt-2 grid gap-2 text-sm leading-6 text-muted">
        {items.map(item => <li key={item}>• {item}</li>)}
      </ul>
    </div>
  )
}
