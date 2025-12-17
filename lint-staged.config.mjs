export const typescriptModuleConfig = {
  '**/*.{json,md}': ['prettier --write'],
  '**/*.ts': [() => 'tsc --noEmit', 'eslint --flag unstable_config_lookup_from_file --fix', 'prettier --write'],
};

export default typescriptModuleConfig;
