import { useEffect, useRef } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router';

import { ChatRouter } from '../../chat/routers/chat.router';
import { CommonSuspense } from '../../common/components/common-suspense';
import { CommonSuspenseFallback } from '../../common/components/common-suspense-fallback';
import { UserManagementRouter } from '../../user-management/routers/user-management.router';
import { AnalyticsEventEnum } from '../constants/analytics-event.constant';
import { PathEnum } from '../constants/path.constant';
import { useAppDispatch } from '../hooks/use-app-dispatch';
import { useAppSelector } from '../hooks/use-app-selector';
import { HomeScreenLazy } from '../screens/home.screen.lazy';
import { NotFoundScreen } from '../screens/not-found.screen';
import { selectAppInitializedStatus } from '../selectors/app-initialized-status.selector';
import { getMixpanelEventService } from '../services/service-container.service';
import { loadAppThunk } from '../slices/app-lifecycle-slice/thunks/load-app.thunk';
import { getUrlUtil } from '../utils/url.util';

const browserRouter = createBrowserRouter([
  {
    path: PathEnum.HOME,
    element: (
      <CommonSuspense suspenseKey={PathEnum.HOME}>
        <HomeScreenLazy />
      </CommonSuspense>
    ),
  },

  ...UserManagementRouter,

  ...ChatRouter,

  {
    path: '*',
    element: <NotFoundScreen />,
  },
]);

export const MainRouter = () => {
  const dispatch = useAppDispatch();
  const isAppInitialized = useAppSelector(selectAppInitializedStatus);
  const effectRef = useRef(false);

  useEffect(() => {
    if (!effectRef.current) {
      effectRef.current = true;

      // Track page load event as soon as possible
      getMixpanelEventService().trackEvent({
        event: AnalyticsEventEnum.PAGE_LOAD,
        data: {
          url: window.location.href,
          pathname: window.location.pathname,
          referrer: document.referrer || 'direct',
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        },
      });

      getUrlUtil().setBrowserRouter(browserRouter);
      dispatch(loadAppThunk());
    }
  }, [dispatch]);

  if (!isAppInitialized) {
    return <CommonSuspenseFallback />;
  }

  return <RouterProvider router={browserRouter} />;
};
