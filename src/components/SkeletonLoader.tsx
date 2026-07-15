import React from "react";

interface SkeletonLoaderProps {
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-[#FAF8F5] border border-stone-200/60 overflow-hidden flex flex-col shadow-sm animate-pulse"
        >
          {/* Mock image container */}
          <div className="relative h-56 bg-stone-200" />

          {/* Mock content container */}
          <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
            <div>
              {/* Badges line */}
              <div className="flex justify-between items-center mb-3">
                <div className="h-4 bg-stone-250 w-24 rounded-xs" />
                <div className="h-4 bg-stone-250 w-16 rounded-xs" />
              </div>

              {/* Title line */}
              <div className="h-6 bg-stone-300 w-3/4 rounded-xs mb-2" />

              {/* Sub-details line */}
              <div className="h-4 bg-stone-200 w-1/2 rounded-xs mb-4" />

              {/* Bullet details mock */}
              <div className="space-y-2 mb-4">
                <div className="h-3.5 bg-stone-200 w-full rounded-xs" />
                <div className="h-3.5 bg-stone-200 w-5/6 rounded-xs" />
              </div>
            </div>

            {/* Bottom row button and specs */}
            <div className="border-t border-stone-200/60 pt-4 flex justify-between items-center">
              <div className="h-6 bg-stone-300 w-20 rounded-xs" />
              <div className="h-9 bg-stone-300 w-24 rounded-xs" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
