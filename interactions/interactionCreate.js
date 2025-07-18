// interactions/interactionCreate.js

const {
  Client,
  GatewayIntentBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');

const { saveSalesData, loadSalesData } = require('../utils/storage');
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const bucketName = 'uriage_csv';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isButton()) {
      if (interaction.customId === 'edit_entry') {
        const guildId = interaction.guildId;
        if (!guildId) {
          await interaction.reply({ content: 'ギルドIDが取得できません。', ephemeral: true });
          return;
        }
        const username = interaction.user.username;

        const embed = interaction.message?.embeds?.[0];
        if (!embed) {
          await interaction.reply({ content: '埋め込みが見つかりません。', ephemeral: true });
          return;
        }
        const dateField = embed.fields.find(f => f.name === '日付');
        if (!dateField) {
          await interaction.reply({ content: '日付情報が見つかりません。', ephemeral: true });
          return;
        }

        const date = dateField.value.replace(/\//g, '-');

        let salesData;
        try {
          salesData = await loadSalesData(guildId, date, username);
        } catch {
          await interaction.reply({ content: '保存済みデータの読み込みに失敗しました。', ephemeral: true });
          return;
        }

        const modal = new ModalBuilder()
          .setCustomId('sales_modal')
          .setTitle('売上報告 再入力');

        const inputs = [
          ['date', '日付 (例: 7/18)', salesData['日付'] || ''],
          ['total', '総売り', String(salesData['総売り'] || '')],
          ['cash', '現金', String(salesData['現金'] || '')],
          ['card', 'カード', String(salesData['カード'] || '')],
          ['expense', '諸経費', String(salesData['諸経費'] || '')],
        ].map(([id, label, value]) =>
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(id)
              .setLabel(label)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setValue(value)
          )
        );

        modal.addComponents(...inputs);
        await interaction.showModal(modal);
        return;
      }

      if (['select_date', 'select_month', 'select_quarter'].includes(interaction.customId)) {
        const guildId = interaction.guildId;
        if (!guildId) {
          await interaction.reply({ content: 'ギルドIDが取得できません。', ephemeral: true });
          return;
        }

        const [files] = await storage.bucket(bucketName).getFiles({ prefix: `data/sales_reports/${guildId}/` });
        const allFiles = files.map(f => f.name);

        const parseDateFromFilename = (filename) => {
          const m = filename.match(/uriage-houkoku-(\d{4}-\d{2}(?:-\d{2})?)-/);
          return m ? m[1] : null;
        };

        const dates = allFiles.map(parseDateFromFilename).filter(Boolean);

        let options = [];

        if (interaction.customId === 'select_date') {
          const uniqueDates = [...new Set(dates.filter(d => d.length === 10))].sort((a, b) => new Date(b) - new Date(a));
          options = uniqueDates.map(date => ({ label: date, description: `日付: ${date}`, value: date }));
        } else if (interaction.customId === 'select_month') {
          const uniqueMonths = [...new Set(dates.map(d => d.slice(0, 7)))].sort((a, b) => new Date(b + '-01') - new Date(a + '-01'));
          options = uniqueMonths.map(month => ({ label: month, description: `月: ${month}`, value: month }));
        } else if (interaction.customId === 'select_quarter') {
          const uniqueMonths = [...new Set(dates.map(d => d.slice(0, 7)))];
          const quarters = {};
          uniqueMonths.forEach(month => {
            const [year, mon] = month.split('-').map(Number);
            const qStartMonth = Math.floor((mon - 1) / 3) * 3 + 1;
            const qEndMonth = qStartMonth + 2;
            const qLabel = `${year}-${String(qStartMonth).padStart(2, '0')}~${year}-${String(qEndMonth).padStart(2, '0')}`;
            if (!quarters[qLabel]) quarters[qLabel] = [];
            quarters[qLabel].push(month);
          });
          const sortedQuarterLabels = Object.keys(quarters).sort((a, b) => new Date(b.split('~')[1]) - new Date(a.split('~')[1]));
          options = sortedQuarterLabels.map(qLabel => ({ label: qLabel, description: `4半期: ${qLabel}`, value: qLabel }));
        }

        if (options.length === 0) {
          await interaction.reply({ content: '該当するCSVファイルが見つかりませんでした。', ephemeral: true });
          return;
        }

        const selectMenu = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`select_csv_${interaction.customId}`)
            .setPlaceholder('CSVファイルを選択してください')
            .addOptions(options.slice(0, 25))
        );

        await interaction.update({ content: 'CSVファイルを選択してください。', components: [selectMenu], embeds: [] });
        return;
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'sales_modal') {
        const dateInput = interaction.fields.getTextInputValue('date');
        const total = parseInt(interaction.fields.getTextInputValue('total'));
        const cash = parseInt(interaction.fields.getTextInputValue('cash'));
        const card = parseInt(interaction.fields.getTextInputValue('card'));
        const expense = parseInt(interaction.fields.getTextInputValue('expense'));

        if ([total, cash, card, expense].some(v => isNaN(v))) {
          await interaction.reply({ content: '金額欄には半角数字のみ入力してください。', ephemeral: true });
          return;
        }

        const remain = total - cash - expense;
        const now = new Date();
        const year = now.getFullYear();
        const date = `${year}-${dateInput.replace(/\//g, '-')}`;

        const guildId = interaction.guildId;
        if (!guildId) {
          await interaction.reply({ content: 'ギルドIDが取得できません。', ephemeral: true });
          return;
        }
        const username = interaction.user.username;

        const salesData = {
          入力者: interaction.user.tag,
          日付: dateInput,
          総売り: total,
          現金: cash,
          カード: card,
          諸経費: expense,
          残: remain,
        };

        try {
          await saveSalesData(guildId, date, username, salesData);
        } catch (err) {
          console.error('Cloud Storageへの保存エラー:', err);
          await interaction.reply({ content: 'Cloud Storageへの保存に失敗しました。', ephemeral: true });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('売上報告')
          .addFields(
            { name: '入力者', value: `<@${interaction.user.id}>`, inline: true },
            { name: '日付', value: dateInput, inline: true },
            { name: '総売り', value: `¥${total.toLocaleString()}`, inline: true },
            { name: '現金', value: `¥${cash.toLocaleString()}`, inline: true },
            { name: 'カード', value: `¥${card.toLocaleString()}`, inline: true },
            { name: '諸経費', value: `¥${expense.toLocaleString()}`, inline: true },
            { name: '残', value: `¥${remain.toLocaleString()}`, inline: true },
          );

        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('next_expense')
            .setLabel('経費申請')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('edit_entry')
            .setLabel('修正')
            .setStyle(ButtonStyle.Secondary),
        );

        if (interaction.message) {
          await interaction.message.edit({ embeds: [embed], components: [buttons] });
          await interaction.reply({ content: '売上報告を更新しました。', ephemeral: true });
        } else {
          await interaction.reply({ embeds: [embed], components: [buttons] });
        }
        return;
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('select_csv_')) {
        const guildId = interaction.guildId;
        if (!guildId) {
          await interaction.reply({ content: 'ギルドIDが取得できません。', ephemeral: true });
          return;
        }
        const selectedValue = interaction.values[0];
        const type = interaction.customId.replace('select_csv_', '');

        const [files] = await storage.bucket(bucketName).getFiles({ prefix: `data/sales_reports/${guildId}/` });

        let matchedFiles = [];
        if (type === 'select_date') {
          matchedFiles = files.filter(f => f.name.includes(`uriage-houkoku-${selectedValue}-`));
        } else if (type === 'select_month') {
          matchedFiles = files.filter(f => f.name.includes(`uriage-houkoku-${selectedValue}`));
        } else if (type === 'select_quarter') {
          const [start, end] = selectedValue.split('~');
          matchedFiles = files.filter(f => {
            const dateStr = (f.name.match(/uriage-houkoku-(\d{4}-\d{2})/) || [])[1];
            return dateStr && dateStr >= start && dateStr <= end;
          });
        }

        if (matchedFiles.length === 0) {
          await interaction.reply({ content: '該当するCSVファイルが見つかりませんでした。', ephemeral: true });
          return;
        }

        const fileName = matchedFiles[0].name;
        const options = {
          version: 'v4',
          action: 'read',
          expires: Math.floor(Date.now() / 1000) + 15 * 60,
        };

        const [signedUrl] = await storage.bucket(bucketName).file(fileName).getSignedUrl(options);

        const issuedAt = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

        const embed = new EmbedBuilder()
          .setTitle('📄 売上報告CSV')
          .setDescription(
            `選択された期間: ${selectedValue}\n` +
            `[こちらをクリックしてCSVファイルをダウンロード](${signedUrl})\n\n` +
            `**URL発行時間:** ${issuedAt}\n` +
            `このURLは発行から15分間有効です。`
          )
          .setColor(0x00AE86);

        await interaction.update({ embeds: [embed], components: [] });
        return;
      }
    }
  } catch (error) {
    console.error('interactionCreate error:', error);
    if (interaction.replied || interaction.deferred) return;
    await interaction.reply({ content: 'エラーが発生しました。', ephemeral: true });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
