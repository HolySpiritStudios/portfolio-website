import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { CommonButton } from '../../common/components/common-button';
import { CommonScreenContainer } from '../../common/components/common-screen-container';
import { PasswordInput } from '../../common/components/inputs/password-input';
import { TextInput } from '../../common/components/inputs/text-input';
import { PathEnum } from '../../main/constants/path.constant';
import { useSignUp } from '../hooks/sign-up.hook';

export const SignUpScreen: FC = () => {
  const { t } = useTranslation('userManagement');
  const { formData, errors, isLoading, handleChange, handleClear, handleSubmit } = useSignUp();

  return (
    <CommonScreenContainer>
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
          <div className="mb-6">
            <img src="/images/logo.svg" alt="Logo" className="mx-auto h-16 w-auto" />
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-gray-900">{t('sign_up_title')}</h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
            <TextInput
              id="name"
              name="name"
              label={t('sign_up_name_label')}
              value={formData.name}
              onChange={handleChange('name')}
              error={errors.name}
              placeholder={t('sign_up_name_placeholder')}
              onClear={handleClear('name')}
            />

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
              placeholder={t('sign_up_password_placeholder')}
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
              {t('sign_up_submit')}
            </CommonButton>

            <div className="text-center">
              <span className="text-gray-600 font-medium">{t('sign_up_alternate_prompt')}</span>{' '}
              <Link
                to={PathEnum.SIGN_IN}
                className="font-semibold text-brand-600 hover:text-brand-700 underline decoration-2 transition-colors duration-200"
              >
                {t('sign_up_alternate_action')}
              </Link>
            </div>
          </div>
        </form>
      </div>
    </CommonScreenContainer>
  );
};
