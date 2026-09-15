import { Button } from "@/components/ui/Button";

interface EntryCardHeaderProps {
  index: number;
  onRemove: () => void;
}

/**
 * "Entry N" label + Remove button row used at the top of each
 * repeatable entry card (education, recommendations, volunteering…).
 */
export function EntryCardHeader({ index, onRemove }: EntryCardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        Entry {index + 1}
      </span>
      <Button variant="danger" size="sm" onClick={onRemove}>
        Remove
      </Button>
    </div>
  );
}
