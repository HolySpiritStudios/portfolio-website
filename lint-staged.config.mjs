export const typescriptModuleConfig = {
  '**/*.ts': [() => 'tsc --noEmit', 'eslint --flag unstable_config_lookup_from_file --fix', 'prettier --write'],
};

export default typescriptModuleConfig;
