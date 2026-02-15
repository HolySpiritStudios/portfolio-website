import { EnvironmentEnum } from '../../main/constants/environment.constant';

type ConfigType = 'environment';

const getBucketName = (environmentName: string): string => {
  return environmentName === (EnvironmentEnum.PRODUCTION as string)
    ? 'portfolio-production-assets'
    : 'portfolio-integration-assets';
};

export const mapConfigUrl = (environmentName: string, configType: ConfigType): string => {
  const bucketName = getBucketName(environmentName);
  const envPath = environmentName === (EnvironmentEnum.PRODUCTION as string) ? 'production' : environmentName;

  return `https://${bucketName}.s3.us-east-1.amazonaws.com/app-configs/${envPath}/${configType}.json`;
};

export const mapAppConfigsUrl = (environmentName: string): string => {
  return mapConfigUrl(environmentName, 'environment');
};
