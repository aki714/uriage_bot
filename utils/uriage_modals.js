// utils/uriage_modals.js

module.exports = {
  async execute(interaction) {
    if (!interaction.isModalSubmit()) return false;

    if (interaction.customId === 'sales_report_modal') {
      const date = interaction.fields.getTextInputValue('report_date');
      const total = interaction.fields.getTextInputValue('report_total');
      const cash = interaction.fields.getTextInputValue('report_cash');
      const card = interaction.fields.getTextInputValue('report_card');
      const expense = interaction.fields.getTextInputValue('report_expense');

      // バリデーション: 数値であること
      const isValid = [total, cash, card, expense].every(v => /^\d+$/.test(v));
      if (!isValid) {
        return interaction.reply({
          content: '金額はすべて半角数字で入力してください。',
          ephemeral: true,
        });
      }

      const year = new Date().getFullYear();

      await interaction.reply({
        content: `✅ 売上報告を受け付けました。\n\n- 年: ${year}\n- 日付: ${date}\n- 総売り: ¥${total}\n- 現金: ¥${cash}\n- カード: ¥${card}\n- 諸経費: ¥${expense}`,
        ephemeral: true,
      });

      return true;
    }

    return false;
  },
};