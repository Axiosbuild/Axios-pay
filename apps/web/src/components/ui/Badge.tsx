const statusClasses: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-success',
  PENDING: 'bg-amber-100 text-brand-amber',
  FAILED: 'bg-red-100 text-error',
  PROCESSING: 'bg-blue-100 text-blue-700',
  REVERSED: 'bg-gray-100 text-text-muted',
};

export function Badge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}
