// Shared lint-staged configuration
export const sharedConfig = {
  '**/*.{json,md}': ['prettier --write'],
};

export default {
  ...sharedConfig,
  '*.ts': [
    'prettier --write',
  ],
};
