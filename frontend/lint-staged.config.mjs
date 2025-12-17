import { typescriptModuleConfig } from '../lint-staged.config.mjs';

export default {
  '**/*.{json,md}': ['prettier --write'],
  '**/*.{js,jsx,ts,tsx,mjs,mts,css}': typescriptModuleConfig['**/*.ts'],
};
