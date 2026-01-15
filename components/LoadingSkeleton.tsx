/**
 * Loading Skeleton Components for Lazy-Loaded Views
 * Provides instant visual feedback while views load
 */

import React from 'react';

// Generic shimmer animation component
const Shimmer: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`} />
);

// Main view skeleton for role-based views
export const ViewSkeleton: React.FC = () => (
  <div className="space-y-6 p-4">
    {/* Header skeleton */}
    <div className="flex items-center gap-4">
      <Shimmer className="w-12 h-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-5 w-1/3" />
        <Shimmer className="h-3 w-1/4" />
      </div>
    </div>
    
    {/* Main action card skeleton */}
    <div className="glass-panel rounded-2xl p-6 space-y-4">
      <Shimmer className="h-6 w-2/3" />
      <Shimmer className="h-12 w-full" />
      <Shimmer className="h-12 w-full" />
      <div className="flex gap-3 pt-2">
        <Shimmer className="h-10 flex-1" />
        <Shimmer className="h-10 flex-1" />
      </div>
    </div>
    
    {/* Quick actions skeleton */}
    <div className="grid grid-cols-4 gap-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex flex-col items-center gap-2">
          <Shimmer className="w-14 h-14 rounded-xl" />
          <Shimmer className="h-3 w-12" />
        </div>
      ))}
    </div>
    
    {/* Content cards skeleton */}
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="glass-panel rounded-xl p-4 flex items-center gap-4">
          <Shimmer className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-3/4" />
            <Shimmer className="h-3 w-1/2" />
          </div>
          <Shimmer className="w-16 h-8 rounded-lg" />
        </div>
      ))}
    </div>
  </div>
);

// Compact skeleton for smaller sections
export const CardSkeleton: React.FC = () => (
  <div className="glass-panel rounded-xl p-4 space-y-3">
    <Shimmer className="h-5 w-1/2" />
    <Shimmer className="h-20 w-full" />
    <Shimmer className="h-8 w-1/3" />
  </div>
);

// Profile skeleton
export const ProfileSkeleton: React.FC = () => (
  <div className="space-y-6 p-4">
    <div className="flex flex-col items-center gap-4">
      <Shimmer className="w-24 h-24 rounded-full" />
      <Shimmer className="h-6 w-40" />
      <Shimmer className="h-4 w-32" />
    </div>
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-4 p-4 glass-panel rounded-xl">
          <Shimmer className="w-10 h-10 rounded-lg" />
          <Shimmer className="h-5 flex-1" />
          <Shimmer className="w-6 h-6" />
        </div>
      ))}
    </div>
  </div>
);

export default ViewSkeleton;
