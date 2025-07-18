// discord_sales_bot/commands/uriage_houkoku.js

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('売上報告設置')
    .setDescription('売上報告用のEmbedメッセージを設置します'),
  
  async execute(interaction) {
    // コマンド実行ログをターミナルに出力
    console.log(`[${new Date().toISOString()}] コマンド「${interaction.commandName}」がユーザー「${interaction.user.tag}」によって実行されました。`);

    // 処理に時間がかかる場合に備え、応答の遅延を通知（エフェメラル＝本人だけに見える）
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('売上報告')
      .addFields(
        { name: '日付', value: '例 7/7', inline: true },
        { name: '総売り', value: '例 300,000', inline: true },
        { name: '現金', value: '例 150,000', inline: true },
        { name: 'カード', value: '例 150,000', inline: true },
        { name: '諸経費', value: '例 150,000', inline: true },
      )
      .setColor(0x0099ff);

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

    // フォローアップでEmbedメッセージとボタンを送信
    await interaction.followUp({ embeds: [embed], components: [buttons] });
  }
};
