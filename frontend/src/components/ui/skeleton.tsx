import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Animation variant
   */
  variant?: 'pulse' | 'shimmer';
}

/**
 * Skeleton Loading Component
 * 
 * A placeholder UI component that mimics the shape of content
 * while it's loading. Supports pulse and shimmer animations.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'pulse',
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-md bg-slate-200 dark:bg-slate-700',
        variant === 'pulse' && 'animate-pulse',
        variant === 'shimmer' && 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
        className
      )}
      {...props}
    />
  );
};

/**
 * Skeleton Text - For text/paragraph placeholders
 */
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 1,
  className,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
};

/**
 * Skeleton Avatar - For circular avatar placeholders
 */
export const SkeletonAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <Skeleton
      className={cn('rounded-full', sizeClasses[size], className)}
    />
  );
};

/**
 * Skeleton Input - For form input placeholders
 */
export const SkeletonInput: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <Skeleton
      className={cn('h-10 w-full rounded-xl', className)}
    />
  );
};

/**
 * Skeleton Card - For card content placeholders
 */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'rounded-2xl border p-6 space-y-4',
        'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
        className
      )}
    >
      <div className="flex items-center gap-4">
        <SkeletonAvatar size="lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
};

/**
 * Skeleton Form - For form placeholders (used in edit modals)
 */
export const SkeletonForm: React.FC<{ 
  fields?: number;
  hasImage?: boolean;
  className?: string;
}> = ({ 
  fields = 4,
  hasImage = true,
  className,
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Image Upload Skeleton */}
      {hasImage && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}
      
      {/* Form Fields Skeleton */}
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <SkeletonInput />
        </div>
      ))}
      
      {/* Action Buttons Skeleton */}
      <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 flex-1 rounded-xl" />
      </div>
    </div>
  );
};

export default Skeleton;
