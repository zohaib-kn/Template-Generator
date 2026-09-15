interface EmptyStateProps {
  message: string;
}

/**
 * Placeholder shown in a repeatable-entry form list before any entries exist.
 */
export function EmptyState({ message }: EmptyStateProps) {
  return (
    <p className="text-sm text-slate-400 text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
      {message}
    </p>
  );
}
