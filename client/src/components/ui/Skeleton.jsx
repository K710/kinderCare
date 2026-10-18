import clsx from 'clsx';

export function Skeleton({ className }) {
  return <div className={clsx('animate-pulse rounded-btn bg-line/70', className)} aria-hidden />;
}

// Skeleton toàn trang khi đang tải phiên
export function PageSkeleton() {
  return (
    <div className="space-y-4 p-6" aria-busy="true" aria-label="Đang tải">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-24 w-full rounded-card" />
      <Skeleton className="h-24 w-full rounded-card" />
    </div>
  );
}
