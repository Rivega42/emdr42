module.exports = {
  apps: [
    {
      name: 'emdr42-frontend',
      cwd: '/opt/emdr42',
      script: 'node_modules/.bin/next',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'emdr42-api',
      cwd: '/opt/emdr42/services/api',
      script: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 8000,
      },
    },
    {
      name: 'emdr42-orchestrator',
      cwd: '/opt/emdr42/services/orchestrator',
      script: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 8002,
      },
    },
  ],
};
