import { createAsyncThunk } from '@reduxjs/toolkit';

import { EnvironmentVariable } from '../../../../main/constants/environment-variable.constant.ts';
import { ThunkApiConfigType } from '../../../../main/store/main.store.ts';
import { getAwsAuthUtil } from '../../../../main/utils/aws/aws-auth.util.ts';
import { getAwsConfigUtil } from '../../../../main/utils/aws/aws-config.util.ts';
import { initializeChatClient } from '../../../../main/utils/clients/chat-client.util.ts';
import { getRestClientUtil } from '../../../../main/utils/clients/rest-client.util.ts';
import { getLocaleUtil } from '../../../../main/utils/locale.util.ts';
import { getToasterUtil } from '../../../../main/utils/toaster.util.ts';
import { getUrlUtil } from '../../../../main/utils/url.util.ts';
import { selectEnvironmentConfigAvailability } from '../../../selectors/environment-config-availability.selector.ts';
import { selectEnvironmentConfig } from '../../../selectors/environment-config.selector.ts';
import { ENVIRONMENT_SLICE_NAME } from '../envionment.slice.types.ts';

import { selectConfigThunk } from './select-config.thunk.ts';

export const rehydrateConfigThunk = createAsyncThunk<void, void, ThunkApiConfigType>(
  `${ENVIRONMENT_SLICE_NAME}/rehydrateConfig`,
  async (_, { dispatch, getState }) => {
    const isConfigAvailable = selectEnvironmentConfigAvailability(getState());
    const setEnvParam = getUrlUtil().getQueryParams(window.location.href)?.setEnv;

    if (!isConfigAvailable || setEnvParam) {
      await dispatch(selectConfigThunk({ environmentName: setEnvParam ?? EnvironmentVariable.ENVIRONMENT })).unwrap();
      return;
    }

    const config = selectEnvironmentConfig(getState());
    if (!config) {
      return;
    }

    getAwsConfigUtil().configureAws(config);
    getRestClientUtil().initialize(config);
    initializeChatClient(config.apiUrl);

    const url = new URL(window.location.href);
    try {
      const magicToken = url.searchParams.get('magicToken');
      const email = url.searchParams.get('email');
      if (magicToken && email) {
        const success = await getAwsAuthUtil().signInWithMagicToken(email, magicToken);
        if (!success) {
          getToasterUtil().showError(getLocaleUtil().select('errors:magic_link_failed'));
        }
      }
    } catch (_e) {
      getToasterUtil().showError(getLocaleUtil().select('errors:magic_link_failed'));
    } finally {
      url.searchParams.delete('magicToken');
      url.searchParams.delete('email');
      window.history.replaceState({}, '', url.toString());
    }
  },
);
