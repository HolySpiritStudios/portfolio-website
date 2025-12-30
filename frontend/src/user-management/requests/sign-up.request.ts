import { API_ROUTES } from '@ws-mono/shared/constants/api-routes.constant';

import { CommonSuccessResponse } from '../../common/models/common-request.model.ts';
import { getRestClientUtil } from '../../main/utils/clients/rest-client.util.ts';

interface Props {
  fullName: string;
  email: string;
  password: string;
}

export const signUpRequest = async (props: Props) => {
  const response = await getRestClientUtil().post<CommonSuccessResponse, Props>(API_ROUTES.AUTH.SIGN_UP, props, {
    useAuth: false,
  });

  return response;
};
