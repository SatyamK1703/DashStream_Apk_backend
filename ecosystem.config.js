/**
 * PM2 Ecosystem Configuration for DashStream Production Deployment
 * This file configures PM2 for production deployment with clustering and monitoring
 */
module.exports = {
  apps: [{
    name: 'dashstream-api',
    script: './src/server.production.js',
    cwd: './',
    instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
    exec_mode: 'cluster',
    
    // Environment configuration
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },

    // PM2 Options
    watch: false, // Disable in production, enable in development
    watch_delay: 1000,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Auto restart configuration
    autorestart: true,
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Memory and CPU limits
    max_memory_restart: '500M',
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // Health monitoring
    health_check_grace_period: 3000,
    health_check_http_url: 'http://localhost:5000/health',
    
    // Process management
    kill_retry_time: 100,
    wait_ready: true,
    shutdown_with_message: true,
    
    // Advanced PM2 features
    instance_var: 'INSTANCE_ID',
    combine_logs: true,
    
    // Node.js specific options
    node_args: '--max-old-space-size=512',
    
    // Source map support for better error traces
    source_map_support: true,
    
    // Graceful shutdown
    kill_timeout: 5000,
    shutdown_with_message: true,
    
    // Environment specific overrides
    ...(process.env.NODE_ENV === 'production' && {
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024'
    }),
    
    ...(process.env.NODE_ENV === 'development' && {
      instances: 1,
      exec_mode: 'fork',
      watch: true,
      ignore_watch: ['node_modules', 'logs', 'uploads', 'public']
    })
  }],

  // PM2 deployment configuration
  deploy: {
    production: {
      user: 'ubuntu',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'https://github.com/yourusername/dashstream-backend.git',
      path: '/var/www/dashstream-api',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install nodejs npm -y',
      'post-setup': 'npm install && npm run build',
      env: {
        NODE_ENV: 'production'
      }
    },
    
    staging: {
      user: 'ubuntu',
      host: ['your-staging-server.com'],
      ref: 'origin/develop',
      repo: 'https://github.com/yourusername/dashstream-backend.git',
      path: '/var/www/dashstream-api-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};