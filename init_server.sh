#!/bin/bash

# --- Configuration ---
set -e # Exit immediately if a command exits with a non-zero status.

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PROJECT_DIR="$HOME/uriage_bot"

# --- Error Handling ---
handle_error() {
    local exit_code=$?
    echo -e "${RED}❌ エラーが発生しました (終了コード: $exit_code, 行番号: $1)。処理を中止します。${NC}"
    exit $exit_code
}
trap 'handle_error $LINENO' ERR

echo -e "${GREEN}--- サーバー初期化スクリプト開始 ---${NC}"

# --- 1. System Setup ---
echo -e "\n${YELLOW}1. システムのセットアップ中...${NC}"
echo "🕒 タイムゾーンを Asia/Tokyo に設定"
sudo timedatectl set-timezone Asia/Tokyo

echo "📦 パッケージリストを更新"
sudo apt-get update && sudo apt-get upgrade -y

echo "📦 Node.js 18.x の公式推奨インストールを実行"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "🔧 Node.js と npm のバージョン確認:"
node -v
npm -v

echo "🚀 PM2 をグローバルインストール"
sudo npm install -g pm2

# --- 2. Project Setup ---
echo -e "\n${YELLOW}2. プロジェクトのセットアップ中...${NC}"
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${RED}エラー: ディレクトリ '$PROJECT_DIR' は既に存在します。${NC}"
    echo "このスクリプトは新規サーバーの初期化用です。既存の環境を更新する場合は 'update.sh' を使用してください。"
    exit 1
fi

echo "📂 GitHubからリポジトリをクローンします: ${PROJECT_DIR}"
git clone https://github.com/star-discord/uriage_bot.git "$PROJECT_DIR"
cd "$PROJECT_DIR"

echo "📝 .env ファイルをセットアップします"
if [ -f .env.sample ]; then
    cp .env.sample .env
    echo -e "${GREEN}✅ '.env.sample' から '.env' を作成しました。${NC}"
else
    echo -e "${YELLOW}⚠️ '.env.sample' が見つかりません。空の '.env' を作成します。${NC}"
    touch .env
fi

echo "📂 ログディレクトリを作成します"
mkdir -p logs

echo "🔑 スクリプトに実行権限を付与します"
chmod +x *.sh

echo -e "\n${YELLOW}*** 重要: .env ファイルを編集してください ***${NC}"
echo "Botのトークンや各種IDを設定する必要があります。"
echo "例: nano .env  または  vim .env"
read -p "編集が完了したら、Enterキーを押して続行してください..."

# --- 3. Dependencies & Deployment ---
echo -e "\n${YELLOW}3. 依存関係のインストールとデプロイ...${NC}"
echo "📦 npm パッケージをインストールしています (数分かかる場合があります)..."
npm install --no-audit --no-fund

echo "📡 スラッシュコマンドをDiscordに登録しています..."
node deploy-commands.js

# --- 4. PM2 Setup ---
echo -e "\n${YELLOW}4. PM2でBotを起動し、自動起動を設定します...${NC}"

echo "🚀 PM2でBotを起動します..."
pm2 start ecosystem.config.js --name uriage-bot

echo "💾 現在のPM2プロセスリストを保存します..."
pm2 save

echo -e "\n${YELLOW}*** 重要: サーバー起動時にBotを自動起動させる設定 ***${NC}"
echo "以下のコマンドをコピーして実行してください:"

STARTUP_COMMAND=$(pm2 startup | grep "sudo")
if [ -n "$STARTUP_COMMAND" ]; then
    echo -e "${GREEN}${STARTUP_COMMAND}${NC}"
    echo -e "${YELLOW}※ 上記コマンドを実行後、画面に表示される追加のコマンドも忘れずに実行してください。${NC}"
else
    echo -e "${RED}PM2の自動起動コマンドの生成に失敗しました。手動で 'pm2 startup' を実行してください。${NC}"
fi

echo -e "\n${GREEN}✅ 初期化処理が正常に完了しました！${NC}"
echo "----------------------------------------"
echo "💡 次のステップ:"
echo "1. 上記の 'sudo ...' で始まるコマンドを実行して、自動起動を有効化してください。"
echo "2. Botの動作状況は以下のコマンドで確認できます:"
echo -e "   - ${GREEN}pm2 status${NC} (プロセスの状態確認)"
echo -e "   - ${GREEN}pm2 logs uriage-bot${NC} (ログのリアルタイム表示)"
echo ""
echo "🔧 Botの更新:"
echo "   今後の更新は、プロジェクトディレクトリ内で以下のコマンドを実行してください:"
echo -e "   - ${GREEN}cd ~/uriage_bot && ./update.sh${NC}"
echo "----------------------------------------"
