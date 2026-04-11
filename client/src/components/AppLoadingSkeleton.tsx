import { Skeleton } from "@/components/ui/skeleton";

function CompanyCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 flex flex-col gap-3">
      {/* Company name */}
      <Skeleton className="h-5 w-3/5" />
      {/* Category badge row */}
      <div className="flex gap-2">
        <Skeleton className="h-4 w-20 rounded-full" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      {/* Description lines */}
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      {/* Location + CTA row */}
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
    </div>
  );
}

export default function AppLoadingSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Skeleton className="h-7 w-32" />
          {/* Nav links */}
          <div className="hidden sm:flex gap-6">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
          {/* CTA button */}
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </header>

      {/* Hero / search area */}
      <div className="bg-white border-b border-gray-100 px-4 py-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-4 items-center">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-11 w-full max-w-xl rounded-lg" />
        </div>
      </div>

      {/* Company card grid */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <CompanyCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
