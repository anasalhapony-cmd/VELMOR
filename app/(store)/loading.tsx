import { Skeleton } from '@/components/ui/Skeleton';

/** Route-level loading state for the storefront (§92). */
export default function StoreLoading() {
  return (
    <div className="container-content py-10">
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[3/4] w-full rounded-lg" />
            <Skeleton className="mt-3 h-4 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
