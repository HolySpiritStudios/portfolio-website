import { typescriptModuleConfig } from '../lint-staged.config.mjs';

export default {
  '**/*.{js,jsx,ts,tsx,mjs,mts}': typescriptModuleConfig['**/*.ts'],
};
