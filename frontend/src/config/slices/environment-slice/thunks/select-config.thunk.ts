import { createAsyncThunk } from '@reduxjs/toolkit';

import { EnvironmentVariable } from '../../../../main/constants/environment-variable.constant';
import { EnvironmentEnum } from '../../../../main/constants/environment.constant';
import { ThunkApiConfigType } from '../../../../main/store/main.store';
import { EnvironmentType } from '../../../../main/types/environment.type';
import { getAwsConfigUtil } from '../../../../main/utils/aws/aws-config.util';
import { initializeChatClient } from '../../../../main/utils/clients/chat-client.util';
import { s3RequestClientUtil } from '../../../../main/utils/clients/s3-client.util';
import { getUrlUtil } from '../../../../main/utils/url.util';
import { signOutThunk } from '../../../../user-management/slices/user-management-slice/thunks/sign-out.thunk';
import { mapAppConfigsUrl } from '../../../mappers/app-configs-url.mapper';
import { ENVIRONMENT_SLICE_NAME } from '../envionment.slice.types';
import { setEnvironment, setEnvironmentLoading } from '../environment.slice';

interface Props {
  environmentName?: string;
}

export const selectConfigThunk = createAsyncThunk<void, Props, ThunkApiConfigType>(
  `${ENVIRONMENT_SLICE_NAME}/selectConfig`,
  async ({ environmentName }, { dispatch }) => {
    const selectedEnvironmentName =
      environmentName ?? getUrlUtil().getQueryParams(window.location.href)?.setEnv ?? EnvironmentVariable.ENVIRONMENT;

    const isProduction = selectedEnvironmentName === (EnvironmentEnum.PRODUCTION as string);
    const isLocalhost = selectedEnvironmentName === (EnvironmentEnum.LOCALHOST as string);
    try {
      dispatch(setEnvironmentLoading(true));

      let config: EnvironmentType;

      // For localhost, use local configuration instead of fetching from S3
      if (isLocalhost) {
        config = {
          apiUrl: 'http://localhost:3001',
          userPoolRegion: import.meta.env.VITE_AWS_REGION || 'us-east-1',
          userPoolId: import.meta.env.VITE_USER_POOL_ID || '',
          userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || '',
          userPoolDomain: import.meta.env.VITE_USER_POOL_DOMAIN || '',
          selfSignUpEnabled: true,
          ssoSignInEnabled: false,
        };

        // Debug: Log the configuration being used
        console.log('🔧 Localhost configuration:', {
          apiUrl: config.apiUrl,
          userPoolRegion: config.userPoolRegion,
          userPoolId: config.userPoolId ? `${config.userPoolId.substring(0, 20)}...` : '(empty)',
          userPoolClientId: config.userPoolClientId ? `${config.userPoolClientId.substring(0, 20)}...` : '(empty)',
          userPoolDomain: config.userPoolDomain || '(empty)',
        });

        // Validate required fields
        if (!config.userPoolId || !config.userPoolClientId || !config.userPoolDomain) {
          console.error('❌ Missing required Cognito configuration! Please check your .env file.');
          console.error('Required variables: AWS_REGION, USER_POOL_ID, USER_POOL_CLIENT_ID, USER_POOL_DOMAIN');
          throw new Error('Missing required Cognito configuration for localhost');
        }
      } else {
        const url = mapAppConfigsUrl(selectedEnvironmentName);
        const { data } = await s3RequestClientUtil.get<EnvironmentType>(url);
        config = data;
      }

      const apiUrl: string = config.apiUrl;
      dispatch(
        setEnvironment({
          name: selectedEnvironmentName,
          config: { ...config, apiUrl },
        }),
      );
      dispatch(setEnvironmentLoading(false));
      dispatch(signOutThunk());

      getAwsConfigUtil().configureAws(config);
      initializeChatClient(apiUrl);

      const { isRemoved, url: newUrl } = getUrlUtil().removeQueryParams(window.location.href, ['setEnv']);
      if (isRemoved) {
        getUrlUtil().replaceUrlState(newUrl);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      window.location.reload();
    } catch (_error) {
      dispatch(setEnvironmentLoading(false));
      if (!isProduction) {
        await dispatch(selectConfigThunk({ environmentName: 'production' })).unwrap();
      }
    }
  },
);
