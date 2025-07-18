// utils/uriage_modals.js

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { saveSalesData, loadSalesData } = require('./storage');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // 修正ボタン押下時の処理
    if (interaction.isButton()) {
      if (interaction.customId === 'edit_entry') {
        const guildId = interaction.guildId;
        if (!guildId) {
          await interaction.reply({ content: 'ギルドIDが取得できません。', ephemeral: true });
          return;
        }

        const embed = interaction.message?.embeds?.[0];
        if (!embed) {
          await interaction.reply({ content: '埋め込みメッセージがありません。', ephemeral: true });
          return;
        }

        const dateField = embed.fields.find(f => f.name === '日付');
        if (!dateField) {
          await interaction.reply({ content: '日付情報が見つかりません。', ephemeral: true });
          return;
        }

        const date = dateField.value.replace(/\//g, '-');
        const username = interaction.user.username;

        let salesData;
        try {
          salesData = await loadSalesData(guildId, date, username);
        } catch (error) {
          console.error(error);
          await interaction.reply({ content: '保存済みデータの読み込みに失敗しました。', ephemeral: true });
          return;
        }

        const modal = new ModalBuilder()
          .setCustomId('sales_modal')
          .setTitle('売上報告 修正');

        const inputs = [
          ['date', '日付 (例: 7/18)', salesData['日付']?.slice(5).replace(/-/g, '/') || ''],
          ['total', '総売り', String(salesData['総売り'] ?? '')],
          ['cash', '現金', String(salesData['現金'] ?? '')],
          ['card', 'カード', String(salesData['カード'] ?? '')],
          ['expense', '諸経費', String(salesData['諸経費'] ?? '')],
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
    }

    // モーダル送信時の処理
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'sales_modal') {
        const guildId = interaction.guildId;
        if (!guildId) {
          await interaction.reply({ content: 'ギルドIDが取得できません。', ephemeral: true });
          return;
        }

        const now = new Date();
        const year = now.getFullYear();

        const dateRaw = interaction.fields.getTextInputValue('date'); // 例: 7/18 または 07/18
        const [monthStr, dayStr] = dateRaw.split('/');
        const month = monthStr?.padStart(2, '0');
        const day = dayStr?.padStart(2, '0');
        if (!month || !day) {
          await interaction.reply({ content: '日付の形式は「7/18」のように入力してください。', ephemeral: true });
          return;
        }
        const date = `${year}-${month}-${day}`;

        const toNumber = (value) => {
          if (!/^\d+$/.test(value)) {
            throw new Error('半角数字のみ入力してください');
          }
          return Number(value);
        };

        let total, cash, card, expense;
        try {
          total = toNumber(interaction.fields.getTextInputValue('total'));
          cash = toNumber(interaction.fields.getTextInputValue('cash'));
          card = toNumber(interaction.fields.getTextInputValue('card'));
          expense = toNumber(interaction.fields.getTextInputValue('expense'));
        } catch (e) {
          await interaction.reply({ content: '金額欄には半角数字のみ入力してください。', ephemeral: true });
          return;
        }

        const remain = total - cash - expense;
        const username = interaction.user.username;

        const salesData = {
          入力者: interaction.user.tag,
          日付: date,
          総売り: total,
          現金: cash,
          カード: card,
          諸経費: expense,
          残: remain,
        };

        try {
          await saveSalesData(guildId, date, username, salesData);
        } catch (error) {
          console.error('Cloud Storageへの保存エラー:', error);
          await interaction.reply({ content: 'Cloud Storageへの保存に失敗しました。', ephemeral: true });
          return;
        }

        const embed = {
          color: 0x0099ff,
          title: '売上報告',
          fields: [
            { name: '入力者', value: `<@${interaction.user.id}>`, inline: true },
            { name: '日付', value: date, inline: true },
            { name: '総売り', value: `¥${total.toLocaleString()}`, inline: true },
            { name: '現金', value: `¥${cash.toLocaleString()}`, inline: true },
            { name: 'カード', value: `¥${card.toLocaleString()}`, inline: true },
            { name: '諸経費', value: `¥${expense.toLocaleString()}`, inline: true },
            { name: '残', value: `¥${remain.toLocaleString()}`, inline: true },
          ],
        };

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
      }
    }
  },
};
