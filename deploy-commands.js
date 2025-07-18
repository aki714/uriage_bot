// deploy-commands.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

// --- 環境変数チェック ---
const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('❌ エラー: .envファイルに DISCORD_TOKEN と CLIENT_ID を設定してください。');
  process.exit(1);
}

/**
 * 'commands'ディレクトリから再帰的にすべてのコマンドファイルを読み込む
 * @param {string} dir - 検索を開始するディレクトリ
 * @returns {string[]} コマンドファイルのフルパスの配列
 */
function loadCommandFiles(dir) {
  const commandFilePaths = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      commandFilePaths.push(...loadCommandFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      commandFilePaths.push(fullPath);
    }
  }
  return commandFilePaths;
}

/**
 * メインのデプロイ処理
 */
async function main() {
  const commands = [];
  const adminCommandsTagged = [];
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = loadCommandFiles(commandsPath);

  console.log('🔍 コマンドファイルを読み込んでいます...');

  // --- コマンドの読み込みとデータ整形 ---
  for (const filePath of commandFiles) {
    try {
      const command = require(filePath);
      const cmd = command.default ?? command;

      console.log(`DEBUG: ${path.relative(__dirname, filePath)} command.data:`, cmd.data);

      if (cmd.data && typeof cmd.data.toJSON === 'function' && typeof cmd.execute === 'function') {
        // 管理者コマンドに "(管理者専用)" を自動付加
        if (cmd.isAdminCommand) {
          const desc = cmd.data.description;
          if (!desc.includes('（管理者専用）')) {
            cmd.data.setDescription(`${desc}（管理者専用）`);
            adminCommandsTagged.push(cmd.data.name);
          }
        }
        commands.push(cmd.data.toJSON());
      } else {
        console.warn(`[⚠️警告] スラッシュコマンドの形式が不正です: ${path.relative(__dirname, filePath)}`);
      }
    } catch (error) {
      console.error(`[❌エラー] コマンドの読み込みに失敗しました: ${path.relative(__dirname, filePath)}`, error);
    }
  }

  if (adminCommandsTagged.length > 0) {
    console.log('🔧 以下のコマンドに「(管理者専用)」タグを自動付加しました:');
    adminCommandsTagged.forEach(name => console.log(`   - /${name}`));
  }
  console.log(`✅ 合計 ${commands.length} 個のコマンドを読み込みました。`);

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  const deployGlobal = process.argv.includes('--global');

  // --- デプロイ処理 ---
  if (deployGlobal) {
    // --- グローバルコマンドとして登録 ---
    console.log(`\n🌍 グローバルコマンドとして ${commands.length} 個のコマンドを登録します...`);
    const data = await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands },
    );
    console.log(`✅ ${data.length} 個のグローバルコマンドを登録しました。（反映に最大1時間かかります）`);
  } else {
    // --- ギルドコマンドとして登録 ---
    if (!GUILD_ID) {
      console.error('❌ エラー: ギルドコマンドを登録するには .env ファイルに GUILD_ID を設定してください。');
      console.log('💡 グローバルに登録する場合は `node deploy-commands.js --global` を実行してください。');
      process.exit(1);
    }
    console.log(`\n🏠 ギルド(${GUILD_ID})に ${commands.length} 個のコマンドを登録します...`);
    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );
    console.log(`✅ ${data.length} 個のギルドコマンドを登録しました。（即時反映）`);
  }
}

// --- スクリプト実行 ---
main().catch(error => {
  try {
    console.error('❌ コマンド登録プロセスで致命的なエラーが発生しました:', error);
    process.exit(1);
  } catch {
    // console.errorが利用できない場合のエラーは無視
  }
});
