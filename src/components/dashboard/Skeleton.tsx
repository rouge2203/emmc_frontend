const Block = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-2xl bg-gray-200 ${className}`} />
);

const DashboardSkeleton = () => (
  <div className="space-y-8">
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }, (_, i) => (
        <Block key={i} className="h-28" />
      ))}
    </div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <Block key={i} className="h-72" />
      ))}
    </div>
    <Block className="h-56" />
  </div>
);

export default DashboardSkeleton;
