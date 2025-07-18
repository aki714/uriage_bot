// utils/uriage_buttons.js

const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require('discord.js');

module.exports = {
    async execute(interaction) {
        if (!interaction.isButton()) return false;

        const { customId } = interaction;

        // ✅ 売上報告モーダル
        if (customId === 'sales_report') {
            const modal = new ModalBuilder()
                .setCustomId('sales_report_modal')
                .setTitle('売上報告');

            const dateInput = new TextInputBuilder()
                .setCustomId('report_date')
                .setLabel('日付（例: 7/18）')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const totalInput = new TextInputBuilder()
                .setCustomId('report_total')
                .setLabel('総売り（例: 300000）')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const cashInput = new TextInputBuilder()
                .setCustomId('report_cash')
                .setLabel('現金（例: 150000）')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const cardInput = new TextInputBuilder()
                .setCustomId('report_card')
                .setLabel('カード（例: 150000）')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const expenseInput = new TextInputBuilder()
                .setCustomId('report_expense')
                .setLabel('諸経費（例: 10000）')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const row1 = new ActionRowBuilder().addComponents(dateInput);
            const row2 = new ActionRowBuilder().addComponents(totalInput);
            const row3 = new ActionRowBuilder().addComponents(cashInput);
            const row4 = new ActionRowBuilder().addComponents(cardInput);
            const row5 = new ActionRowBuilder().addComponents(expenseInput);

            modal.addComponents(row1, row2, row3, row4, row5);

            await interaction.showModal(modal);
            return true;
        }

        return false;
    },
};