export function AssetGroupTabs({ groups, activeGroup, onChange }: { groups: string[]; activeGroup: string; onChange: (group: string) => void }) {
  return (
    <div className="workbench-control-grid flex grid-cols-none gap-2 overflow-x-auto p-2">
      {groups.map(group => (
        <button
          key={group}
          type="button"
          onClick={() => onChange(group)}
          className={`whitespace-nowrap rounded-md border px-3 py-2 text-sm font-semibold transition ${activeGroup === group ? 'border-[rgba(80,210,193,0.45)] bg-[rgba(80,210,193,0.16)] text-white' : 'border-line bg-[rgba(0,0,0,0.16)] text-muted hover:border-steel hover:text-ink'}`}
        >
          {group}
        </button>
      ))}
    </div>
  )
}
