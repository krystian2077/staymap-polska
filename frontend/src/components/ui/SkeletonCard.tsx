export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[18px] border border-gray-200">
      <div
        className="h-[210px] animate-shimmer bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100"
        style={{ backgroundSize: "400px 100%" }}
      />
      <div className="space-y-2 px-[18px] py-3.5">
        <div className="h-4 w-[70%] animate-shimmer rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
        <div className="h-3 w-[45%] animate-shimmer rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
        <div className="flex justify-between pt-2">
          <div className="h-[18px] w-[30%] animate-shimmer rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
          <div className="h-3.5 w-[20%] animate-shimmer rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
        </div>
      </div>
    </div>
  );
}
