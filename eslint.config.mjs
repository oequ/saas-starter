import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc', '**/vitest.config.*.timestamp*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'type:ports',
              onlyDependOnLibsWithTags: ['type:ports'],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:ui'],
            },
            {
              sourceTag: 'type:shared',
              onlyDependOnLibsWithTags: ['type:ports', 'type:shared'],
            },
            {
              sourceTag: 'type:adapters',
              onlyDependOnLibsWithTags: ['type:ports', 'type:adapters'],
            },
            {
              sourceTag: 'type:shell',
              onlyDependOnLibsWithTags: [
                'type:ports',
                'type:shared',
                'type:ui',
                'type:shell',
              ],
            },
            {
              sourceTag: 'type:features',
              onlyDependOnLibsWithTags: [
                'type:ports',
                'type:shared',
                'type:ui',
                'type:shell',
                'type:features',
              ],
            },
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:ports',
                'type:shared',
                'type:ui',
                'type:shell',
                'type:features',
                'type:adapters',
              ],
            },
            {
              sourceTag: 'type:e2e',
              onlyDependOnLibsWithTags: [
                'type:ports',
                'type:shared',
                'type:ui',
                'type:shell',
                'type:features',
                'type:adapters',
              ],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
