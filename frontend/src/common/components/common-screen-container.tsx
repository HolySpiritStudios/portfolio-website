import { FC, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

import { BackgroundElements } from './background-elements';

interface Props {
  children: ReactNode;
  stickyTopComponent?: ReactNode;
  stickyBottomComponent?: ReactNode;
  className?: string;
}

export const CommonScreenContainer: FC<Props> = ({
  children,
  stickyTopComponent,
  stickyBottomComponent,
  className,
}) => {
  const containerClasses = twMerge(
    'flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden',
    className,
  );

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <div className="sticky top-0 z-[100]">{stickyTopComponent}</div>

      <div className={containerClasses}>
        <BackgroundElements />

        <div className="w-full max-w-md space-y-8 relative z-10">{children}</div>
      </div>

      {stickyBottomComponent && <div className="sticky bottom-0 z-[100]">{stickyBottomComponent}</div>}
    </div>
  );
};
