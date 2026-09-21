// pm2 process definition for barbaros-mcp.
// Deploy: pm2 start deploy/ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: 'barbaros-mcp',
      cwd: '/var/www/barbaros-mcp',
      script: 'dist/server.js',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: '8101',
      },
      max_memory_restart: '300M',
      restart_delay: 3000,
      max_restarts: 20,
      out_file: '/var/log/barbaros-mcp/out.log',
      error_file: '/var/log/barbaros-mcp/error.log',
      time: true,
    },
  ],
};
