// utils/storage.js

const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

const bucketName = 'uriage_csv';

/**
 * 売上データを Cloud Storage に保存し、既存ファイルは logs にバックアップ
 * @param {string} guildId
 * @param {string} date - 例: '2025-07-07' （年-月-日形式）
 * @param {string} username - Discordユーザー名など
 * @param {object} salesData - 保存する売上データオブジェクト
 * @throws 保存失敗時に例外をスロー
 */
async function saveSalesData(guildId, date, username, salesData) {
  const filePath = `data/${guildId}/uriage-houkoku-${date}-${username}.json`;
  const timestamp = new Date().toISOString().replace(/:/g, '-'); // ":" はファイル名NG
  const logPath = `logs/${guildId}/uriage-houkoku-${date}-${username}_${timestamp}.json`;
  const jsonString = JSON.stringify(salesData, null, 2);

  const bucket = storage.bucket(bucketName);
  const file = bucket.file(filePath);

  try {
    const [exists] = await file.exists();
    if (exists) {
      await file.copy(bucket.file(logPath));
    }

    await file.save(jsonString, {
      contentType: 'application/json',
      resumable: false,
      metadata: {
        metadata: {
          updated_by: salesData.入力者 || username,
          updated_at: new Date().toISOString(),
        }
      }
    });
  } catch (err) {
    console.error('❌ Cloud Storage への保存エラー:', err);
    throw new Error('Cloud Storage への保存に失敗しました');
  }
}

/**
 * 売上データを Cloud Storage から読み込む
 * @param {string} guildId
 * @param {string} date - 例: '2025-07-07'
 * @param {string} username - Discordユーザー名など
 * @returns {Promise<object>} salesData JSONオブジェクト
 * @throws データ未存在または読み込み失敗時に例外をスロー
 */
async function loadSalesData(guildId, date, username) {
  const filePath = `data/sales_reports/${guildId}/uriage-houkoku-${date}-${username}.json`;
  const file = storage.bucket(bucketName).file(filePath);

  try {
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`データが存在しません: ${filePath}`);
    }

    const [content] = await file.download();
    return JSON.parse(content.toString());
  } catch (err) {
    console.error('❌ Cloud Storage からの読み込みエラー:', err);
    throw new Error('Cloud Storage からの読み込みに失敗しました');
  }
}

module.exports = { saveSalesData, loadSalesData };
