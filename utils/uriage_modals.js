// utils/uriage_modals.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  async execute(interaction) {
    if (!interaction.isModalSubmit()) return false;

    if (interaction.customId === 'sales_report_modal') {
      const date = interaction.fields.getTextInputValue('report_date');
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
          { name: '日付', value: date, inline: true },
          { name: '総売り', value: `¥${totalNum.toLocaleString()}`, inline: true },
          { name: '現金', value: `¥${cashNum.toLocaleString()}`, inline: true },
          { name: 'カード', value: `¥${cardNum.toLocaleString()}`, inline: true },
          { name: '諸経費', value: `¥${expenseNum.toLocaleString()}`, inline: true },
          { name: '残金', value: `¥${balance.toLocaleString()}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `報告者: ${interaction.user.tag}` });

      // 次の報告を促すための新しいボタンを作成
      const newReportButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('sales_report')
          .setLabel('売上報告')
          .setStyle(ButtonStyle.Primary), // 分かりやすいように緑色のボタンにします
      );

      await interaction.reply({
        content: `✅ <@${interaction.user.id}>さん、売上報告を受け付けました。`,
        embeds: [embed],
        components: [newReportButton], // 作成したボタンをメッセージに追加
      });


      return true;
    }

    return false;
  },
};