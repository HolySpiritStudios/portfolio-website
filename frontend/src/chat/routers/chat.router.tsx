import { RouteObject } from 'react-router';

import { CommonSuspense } from '../../common/components/common-suspense';
import { UserAuthenticatedScreenProtector } from '../../common/components/screen-protectors/user-authenticated-screen-protector';
import { PathEnum } from '../../main/constants/path.constant';
import { ChatScreenLazy } from '../screens/chat.screen.lazy';

export const ChatRouter: RouteObject[] = [
  {
    path: PathEnum.CHAT,
    element: (
      <CommonSuspense suspenseKey={PathEnum.CHAT}>
        <UserAuthenticatedScreenProtector>
          <ChatScreenLazy />
        </UserAuthenticatedScreenProtector>
      </CommonSuspense>
    ),
  },
];
