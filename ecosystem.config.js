module.exports = {
  apps: [
    {
      name: "uriage-bot",
      script: "index.js",
      env: {
        GOOGLE_APPLICATION_CREDENTIALS: "/home/star_vesta_legion_kanri/経費申請bot/data/keihi-discord-bot-2-cd84a80ef835.json",
        NODE_ENV: "production",
      },
      // ログファイルパス
      error_file: "/home/star_vesta_legion_kanri/経費申請bot/logs/uriage-bot-error.log",
      out_file: "/home/star_vesta_legion_kanri/経費申請bot/logs/uriage-bot-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
      // 自動再起動設定
      autorestart: true,
      watch: false,  // 本番はwatchをfalseにして安定運用を推奨
      max_restarts: 10,
    }
  ]
};
