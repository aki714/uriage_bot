echo "🚀 uriage_bot 更新処理開始 (Google Cloud Instance版)"

# --- 省略 ---

if [ ! -d ~/uriage_bot ] || [ -z "$(ls -A ~/uriage_bot 2>/dev/null)" ]; then
  echo "📂 uriage_bot フォルダが存在しないか空です。git clone 実行します。"

  if [ -d ~/uriage_bot ]; then
    echo "🗑️ 空のディレクトリを削除中..."
    rm -rf ~/uriage_bot
  fi

  echo "📥 GitHubからクローン中..."
  if git clone --branch master --depth 1 https://github.com/star-discord/uriage_bot.git ~/uriage_bot; then
    echo "✅ git clone 成功"
    cd ~/uriage_bot || exit 1
    chmod +x update.sh sync_from_github.sh
    echo "🔓 実行権限を付与完了"
  else
    echo "❌ git clone 失敗"
    echo "  ネットワーク接続またはGitHub接続を確認してください"
    exit 1
  fi
else
  echo "📂 uriage_bot フォルダが存在します。git pull で最新化します。"
  cd ~/uriage_bot || exit 1
  if git pull origin master; then
    echo "✅ git pull 成功"
  else
    echo "❌ git pull 失敗"
    echo "  ネットワーク接続またはGitHub接続を確認してください"
    exit 1
  fi
fi

# --- 省略 ---

cd ~/uriage_bot || exit 1

# --- 省略 ---

echo "🔄 PM2 Botプロセスを再起動中..."

if pm2 list | grep -q "uriage-bot"; then
  echo "🧹 PM2ログをクリア中..."
  pm2 flush uriage-bot
  echo "🔁 PM2プロセス再起動中..."
  if pm2 restart uriage-bot; then
    pm2 save
    echo "✅ PM2再起動完了"
  else
    echo "❌ PM2再起動失敗"
    echo "💡 手動実行: pm2 restart uriage-bot"
  fi
else
  echo "⚠️ uriage-bot プロセスが見つかりません"
  echo "💡 手動起動: pm2 start ecosystem.config.js"
fi

