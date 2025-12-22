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
    const url = mapAppConfigsUrl(selectedEnvironmentName);

    const isProduction = selectedEnvironmentName === (EnvironmentEnum.PRODUCTION as string);

    try {
      dispatch(setEnvironmentLoading(true));

      const { data } = await s3RequestClientUtil.get<EnvironmentType>(url);

      const apiUrl: string = data.apiUrl;
      dispatch(
        setEnvironment({
          name: selectedEnvironmentName,
          config: { ...data, apiUrl },
        }),
      );
      dispatch(setEnvironmentLoading(false));
      dispatch(signOutThunk());

      getAwsConfigUtil().configureAws(data);
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
