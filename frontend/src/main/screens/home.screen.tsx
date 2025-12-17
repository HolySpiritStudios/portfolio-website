import { selectCurrentUser } from '../../user-management/selectors/user-authentication-status.selector';
import { useAppSelector } from '../hooks/use-app-selector';

export const HomeScreen = () => {
  const user = useAppSelector(selectCurrentUser);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
          <div className="flex items-center gap-4 mb-6">
            <img src="/images/logo.svg" alt="Logo" className="h-12 w-12" />
            <h1 className="text-4xl font-bold text-foreground">Home Screen</h1>
          </div>
          {user && (
            <p className="text-xl text-gray-700">
              Welcome, <span className="font-semibold text-brand-600">{user.name}</span>!
            </p>
          )}
          <p className="mt-4 text-gray-600">
            This is your starter application home screen. Customize it to fit your needs.
          </p>
        </div>
      </div>
    </div>
  );
};
