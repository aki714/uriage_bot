// index.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
} = require('discord.js');

// Google認証JSONのパスを確認（開発・デバッグ用）
console.log('Google Credentials Path:', process.env.GOOGLE_APPLICATION_CREDENTIALS);

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

// --- Slashコマンド読み込み ---
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`⚠️ 無効なコマンドファイルです: ${file}`);
  }
}

// --- モーダルおよび編集ボタン処理 ---
const modalHandler = require(path.join(__dirname, 'utils', 'uriage_modals.js'));
const buttonHandler = require(path.join(__dirname, 'utils', 'uriage_buttons.js'));

// --- 起動ログ ---
client.once(Events.ClientReady, () => {
  console.log(`✅ ログイン成功: ${client.user.tag}`);
});

// --- Interaction全体の処理 ---
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // 1. スラッシュコマンド処理
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }

    // 2. ボタン処理（sales_report など）モーダル処理（sales_report_modal など）
    const buttonHandled = await buttonHandler.execute(interaction);
    if (buttonHandled) return;
    const modalHandled = await modalHandler.execute(interaction);
    if (modalHandled) return;

    // 3. CSVメニュー処理（commands/uriage_csv.js に委譲）
    const csvHandler = client.commands.get('uriage_csv');

    if (interaction.isButton()) {
      if (['select_date', 'select_month', 'select_quarter'].includes(interaction.customId)) {
        await csvHandler.handlePeriodSelection(interaction);
        return;
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('select_csv_')) {
        await csvHandler.handleCSVSelection(interaction);
        return;
      }
    }

  } catch (error) {
    console.error('❌ インタラクション処理エラー:', error);

    // ユーザー向けエラーメッセージ（InteractionResponseFlagsは使わず、ephemeral: true に）
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'コマンド実行中にエラーが発生しました。',
        ephemeral: true,
      });
    } else {
      await interaction.followUp({
        content: 'コマンド実行中にエラーが発生しました。',
        ephemeral: true,
      });
    }
  }
});

// --- Discord Bot ログイン ---
client.login(process.env.DISCORD_TOKEN);

