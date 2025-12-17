import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { CommonButton } from '../../common/components/common-button';
import { CommonScreenContainer } from '../../common/components/common-screen-container';
import { PasswordInput } from '../../common/components/inputs/password-input';
import { TextInput } from '../../common/components/inputs/text-input';
import { selectEnvironmentConfig } from '../../config/selectors/environment-config.selector';
import { PathEnum } from '../../main/constants/path.constant';
import { useAppSelector } from '../../main/hooks/use-app-selector';
import { useSignIn } from '../hooks/sign-in.hook';

export const SignInScreen: FC = () => {
  const { t } = useTranslation('userManagement');
  const environment = useAppSelector(selectEnvironmentConfig);
  const { formData, errors, isLoading, handleChange, handleClear, handleSubmit, handleGoogleSignIn } = useSignIn();

  return (
    <CommonScreenContainer>
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
          <div className="mb-6">
            <img src="/images/logo.svg" alt="Logo" className="mx-auto h-32 w-auto" />
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-gray-900">{t('sign_in_title')}</h2>
        </div>

        {environment?.ssoSignInEnabled && (
          <div className="mt-8 space-y-6">
            <CommonButton
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              fullWidth
              variant="secondary"
              className="flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-xl shadow-md border border-gray-300 hover:border-gray-400 transition-all duration-200 text-base"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t('sign_in_google')}
            </CommonButton>
          </div>
        )}

        {environment?.selfSignUpEnabled && environment?.ssoSignInEnabled && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-600 font-medium">{t('sign_in_divider')}</span>
            </div>
          </div>
        )}

        {environment?.selfSignUpEnabled && (
          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4 bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
              <TextInput
                id="email"
                name="email"
                label={t('common_email_label')}
                value={formData.email}
                onChange={handleChange('email')}
                error={errors.email}
                placeholder={t('common_email_placeholder')}
                onClear={handleClear('email')}
              />

              <PasswordInput
                id="password"
                name="password"
                label={t('common_password_label')}
                value={formData.password}
                onChange={handleChange('password')}
                error={errors.password}
                placeholder={t('sign_in_password_placeholder')}
                onClear={handleClear('password')}
              />
            </div>

            <div className="space-y-4">
              <CommonButton
                type="submit"
                isLoading={isLoading}
                disabled={isLoading}
                fullWidth
                variant="primary"
                size="lg"
              >
                {t('sign_in_submit')}
              </CommonButton>

              <div className="text-center">
                <span className="text-gray-600 font-medium">{t('sign_in_alternate_prompt')}</span>{' '}
                <Link
                  to={PathEnum.SIGN_UP}
                  className="font-semibold text-brand-600 hover:text-brand-700 underline decoration-2 transition-colors duration-200"
                >
                  {t('sign_in_alternate_action')}
                </Link>
              </div>
            </div>
          </form>
        )}
      </div>
    </CommonScreenContainer>
  );
};

export const SignInScreenLazy = SignInScreen;
