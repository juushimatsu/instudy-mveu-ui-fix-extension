-- Схема D1 базы данных для InStudy Clicker

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instudy_user_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    last_sync_at INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    knowledge REAL DEFAULT 0,
    total_knowledge REAL DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    upgrades TEXT DEFAULT '{}',
    updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS score_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_knowledge REAL NOT NULL,
    recorded_at INTEGER DEFAULT (unixepoch())
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_scores_total ON scores(total_knowledge DESC);
CREATE INDEX IF NOT EXISTS idx_history_user ON score_history(user_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);
CREATE INDEX IF NOT EXISTS idx_users_instudy ON users(instudy_user_id);
