import { sharedConfig } from '../lint-staged.config.mjs';

export default {
  ...sharedConfig,
  '**/*.ts': [
    () => 'tsc --noEmit',
    'eslint --flag unstable_config_lookup_from_file --fix',
    'prettier --write',
  ],
};
