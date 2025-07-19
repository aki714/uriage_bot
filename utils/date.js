// utils/date.js

/**
 * '月/日' 形式の文字列を 'YYYY-MM-DD' 形式に正規化する
 * @param {string} dateString - '7/18' のような日付文字列
 * @returns {string|null} - 'YYYY-MM-DD' 形式の文字列、または不正な形式の場合は null
 */
function normalizeDate(dateString) {
    const now = new Date();
    // 時刻情報をリセットして、日付のみで比較するようにする
    now.setHours(0, 0, 0, 0);

    const parts = dateString.split(/[/月日]/).filter(Boolean);
    let month, day;

    if (parts.length === 2) {
        [month, day] = parts.map(Number);
    } else {
        return null; // 不正な形式
    }

    // 日付の妥当性を簡易チェック
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    let year = now.getFullYear();
    const potentialDate = new Date(year, month - 1, day);

    // もし計算された日付が未来の日付なら、去年の日付として扱う
    // (例: 1/1に「12/31」と入力された場合)
    if (potentialDate > now) {
        year -= 1;
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

module.exports = { normalizeDate };