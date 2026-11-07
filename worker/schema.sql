-- 一位島民一列：id 是暗號的雜湊，資料庫裡看不出原本的暗號
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

-- 每臺裝置一列：data 是這臺累積的名字、數字、徽章（JSON）
CREATE TABLE IF NOT EXISTS devices (
  player_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (player_id, device_id)
);
