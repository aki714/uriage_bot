// utils/uriage_modals.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { normalizeDate } = require('./date');

module.exports = {
  async execute(interaction) {
    if (!interaction.isModalSubmit()) return false;

    if (interaction.customId === 'sales_report_modal') {
      const dateInput = interaction.fields.getTextInputValue('report_date');
      const total = interaction.fields.getTextInputValue('report_total');
      const cash = interaction.fields.getTextInputValue('report_cash');
      const card = interaction.fields.getTextInputValue('report_card');
      const expense = interaction.fields.getTextInputValue('report_expense');

      // バリデーション: 数値であることの確認 (マイナスも許容)
      const isValid = [total, cash, card, expense].every(v => /^-?\d+$/.test(v));
      if (!isValid) {
        return interaction.reply({
          content: '金額はすべて半角数字で入力してください。',
          ephemeral: true,
        });
      }

      // 日付を YYYY-MM-DD 形式に正規化
      const normalizedDate = normalizeDate(dateInput);
      if (!normalizedDate) {
        return interaction.reply({
          content: '日付の形式が正しくありません。「月/日」の形式で入力してください。(例: 7/18)',
          ephemeral: true,
        });
      }

      // 文字列を数値に変換
      const totalNum = parseInt(total, 10);
      const cashNum = parseInt(cash, 10);
      const cardNum = parseInt(card, 10);
      const expenseNum = parseInt(expense, 10);

      // 残金の計算
      const balance = totalNum - cashNum - expenseNum;

      // Embedメッセージを作成
      const embed = new EmbedBuilder()
        .setTitle('📈 売上報告')
        .setColor(0x0099ff)
        .setDescription(`${interaction.user} さんからの報告です。`)
        .addFields(
          { name: '日付', value: normalizedDate, inline: true },
          { name: '総売り', value: `¥${totalNum.toLocaleString()}`, inline: true },
          { name: '現金', value: `¥${cashNum.toLocaleString()}`, inline: true },
          { name: 'カード', value: `¥${cardNum.toLocaleString()}`, inline: true },
          { name: '諸経費', value: `¥${expenseNum.toLocaleString()}`, inline: true },
          { name: '残金', value: `¥${balance.toLocaleString()}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `報告者: ${interaction.user.tag}` });

      // ボタンを作成
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('sales_report')
          .setLabel('次の売上を報告')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          // 将来の修正機能のために、customIdに日付とユーザーIDを含めておく
          .setCustomId(`edit_report_${normalizedDate}_${interaction.user.id}`)
          .setLabel('今の報告を修正')
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.reply({
        content: `✅ <@${interaction.user.id}>さん、売上報告を受け付けました。`,
        embeds: [embed],
        components: [buttons],
      });


      return true;
    }

    return false;
  },
};