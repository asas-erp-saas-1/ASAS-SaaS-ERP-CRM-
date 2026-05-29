// .dependency-cruiser.js
module.exports = {
  forbidden: [
    {
      name: 'domain-must-be-pure',
      comment: 'Domain logic MUST NOT depend on Infrastructure or UI.',
      severity: 'error',
      from: { path: '^packages/domain' },
      to: {
        path: [
          '^packages/infrastructure',
          '^apps/web',
          '^apps/workers',
          'node_modules/@supabase'
        ]
      }
    },
    {
      name: 'ui-must-use-kernel',
      comment: 'The UI MUST NOT query UI layers through infrastructure directly. Use Kernel.',
      severity: 'error',
      from: { path: '^apps/web' },
      to: { path: '^packages/infrastructure' }
    },
    {
      name: 'no-direct-db',
      comment: 'Controllers and Route Handlers must not bypass kernel logic.',
      severity: 'error',
      from: { path: '^apps/(web|workers)/src/(app|pages|actions)' },
      to: { path: '^@supabase' }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
      dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-bundled', 'npm-no-pkg']
    },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true
  }
};
