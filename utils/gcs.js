// utils/storage.js
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();
const bucketName = 'uriage_csv';

/**
 * JSONデータを指定のパスに保存
 * @param {string} filePath - GCS上の保存先パス（例: data/sales_reports/guildId/filename.json）
 * @param {object} data - 保存するJSONオブジェクト
 * @throws ファイル保存に失敗した場合は例外をスローします
 */
async function saveJsonToGCS(filePath, data) {
  const file = storage.bucket(bucketName).file(filePath);
  const content = JSON.stringify(data, null, 2);
  await file.save(content, {
    contentType: 'application/json',
    resumable: false,
  });
}

/**
 * 特定のprefixにマッチするファイル一覧を取得
 * @param {string} prefix - ファイルパスの先頭部分（例: data/sales_reports/guildId/）
 * @returns {Promise<Array>} - 該当するファイルオブジェクトの配列
 * @throws ファイル一覧取得に失敗した場合は例外をスローします
 */
async function listFilesInGCS(prefix) {
  const [files] = await storage.bucket(bucketName).getFiles({ prefix });
  return files;
}

/**
 * GCSファイルの署名付きURLを生成
 * @param {string} filePath - 対象ファイルのGCSパス
 * @param {number} expiresInMinutes - 有効期限（分）
 * @returns {Promise<string>} - 署名付きURL
 * @throws 署名付きURL生成に失敗した場合は例外をスローします
 */
async function generateSignedUrl(filePath, expiresInMinutes = 15) {
  const options = {
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  };

  const [url] = await storage.bucket(bucketName).file(filePath).getSignedUrl(options);
  return url;
}

module.exports = {
  saveJsonToGCS,
  listFilesInGCS,
  generateSignedUrl,
};

