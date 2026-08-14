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
    <Block className="h-72" />
    {/* The two historical age cards are full-width rows, not a 2-up grid: one
        bar per year of age runs the histogram past 80 columns, and the trend
        stacks one row per year, so neither fits half a row. The trend block is
        the taller of the two — 15 year rows plus its axis. */}
    <Block className="h-96" />
    <Block className="h-[31rem]" />
  </div>
);

export default DashboardSkeleton;
