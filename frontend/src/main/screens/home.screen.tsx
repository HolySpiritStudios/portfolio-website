import { useNavigate } from 'react-router';

import { CommonButton } from '../../common/components/common-button';
import { ThemeSwitcher } from '../../common/components/theme-switcher.component';
import { selectCurrentUser } from '../../user-management/selectors/user-authentication-status.selector';
import { MatrixFace } from '../components/matrix-face.component';
import { PathEnum } from '../constants/path.constant';
import { useAppSelector } from '../hooks/use-app-selector';

export const HomeScreen = () => {
  const user = useAppSelector(selectCurrentUser);
  const navigate = useNavigate();

  const handleSignIn = () => {
    navigate(PathEnum.SIGN_IN);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Sign In */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/images/logo.svg" alt="Logo" className="h-10 w-10" />
            <h1 className="text-2xl font-bold text-white">Portfolio</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeSwitcher variant="buttons" showLabels />
            {!user && (
              <CommonButton onClick={handleSignIn} variant="primary" size="md">
                Sign In
              </CommonButton>
            )}
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">
                  Welcome, <span className="font-semibold text-brand-400">{user.name}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Matrix AI Face - Full Screen */}
      <MatrixFace />
    </div>
  );
};
