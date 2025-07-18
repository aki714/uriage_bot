// events/modalSubmit.js

const { Events } = require('discord.js');
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();
const bucketName = 'uriage_csv';

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'sales_modal') {
      const rawDate = interaction.fields.getTextInputValue('date'); // 例: 7/7
      const total = interaction.fields.getTextInputValue('total');
      const cash = interaction.fields.getTextInputValue('cash');
      const card = interaction.fields.getTextInputValue('card');
      const expense = interaction.fields.getTextInputValue('expense');

      const isNumeric = (...values) => values.every(v => !isNaN(Number(v)));
      if (!isNumeric(total, cash, card, expense)) {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: '❌ 金額欄にはすべて数値を入力してください。',
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: '❌ 金額欄にはすべて数値を入力してください。',
            ephemeral: true,
          });
        }
        return;
      }

      const user = interaction.user.username;
      const guildId = interaction.guildId;
      const now = new Date();
      const year = now.getFullYear();

      // rawDateが "7/7" のように月/日の形式なので、適切にゼロ埋めもする例
      const [monthPart, dayPart] = rawDate.split('/');
      const month = monthPart.padStart(2, '0');
      const day = dayPart.padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`; // 例: 2025-07-07

      const filePath = `data/sales_reports/${guildId}/uriage-houkoku-${formattedDate}-${user}.json`;

      const content = JSON.stringify({
        入力者: user,
        日付: formattedDate,
        総売り: Number(total),
        現金: Number(cash),
        カード: Number(card),
        諸経費: Number(expense),
        残: Number(total) - Number(cash) - Number(expense),
        登録日時: now.toISOString()
      }, null, 2);

      try {
        const file = storage.bucket(bucketName).file(filePath);
        await file.save(content, {
          resumable: false,
          contentType: 'application/json',
          metadata: {
            metadata: {
              uploaded_by: user,
              uploaded_at: now.toISOString()
            }
          }
        });

        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 15 * 60 * 1000 // 15分有効
        });

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: `✅ 売上報告を保存しました。\nファイル名: \`${filePath}\`\n[📥 JSONダウンロード（15分間有効）](${url})\n🔒 このURLは **${now.toLocaleTimeString()}** から15分間だけ有効です。`,
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: `✅ 売上報告を保存しました。\nファイル名: \`${filePath}\`\n[📥 JSONダウンロード（15分間有効）](${url})\n🔒 このURLは **${now.toLocaleTimeString()}** から15分間だけ有効です。`,
            ephemeral: true,
          });
        }

      } catch (err) {
        console.error('🔥 ファイル保存エラー:', err);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: '❌ 売上報告の保存中にエラーが発生しました。',
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: '❌ 売上報告の保存中にエラーが発生しました。',
            ephemeral: true,
          });
        }
      }
    }
  }
};

