/**
 * InStudy Clicker API — Cloudflare Workers
 * D1 (persistent) + KV (online cache)
 */

/* ──────────────────────────────
 *  КОНФИГ
 * ────────────────────────────── */
const UPGRADES = [
	{ id: 'coffee',    baseCost: 15,     kps: 1,    clickBonus: 0 },
	{ id: 'energy',    baseCost: 100,    kps: 5,    clickBonus: 0 },
	{ id: 'cheat',     baseCost: 50,     kps: 0,    clickBonus: 1 },
	{ id: 'classmate', baseCost: 500,    kps: 10,   clickBonus: 0 },
	{ id: 'teacher',   baseCost: 2500,   kps: 50,   clickBonus: 0 },
	{ id: 'chatgpt',   baseCost: 10000,  kps: 200,  clickBonus: 0 },
	{ id: 'diploma',   baseCost: 50000,  kps: 1000, clickBonus: 0 }
];

const CLICKS_PER_SEC_LIMIT = 18;        // макс. человеческий CPS
const EVENT_BONUS_BUFFER = 5000;        // запас на события (комбо экзамен+лаба+вирус, бонусы кликов и т.д.)
const ONLINE_TTL_SECONDS = 180;         // 3 минуты = онлайн (запас на throttling фоновых вкладок)

/* ──────────────────────────────
 *  CORS
 * ────────────────────────────── */
function corsHeaders(origin) {
	const allowed = ['https://disto.mveu.ru', 'http://disto.mveu.ru', 'null'];
	// chrome-extension:// origins (игра запускается из расширения)
	const isExtension = origin && origin.startsWith('chrome-extension://');
	const isFirefoxExtension = origin && origin.startsWith('moz-extension://');
	const o = (allowed.includes(origin) || isExtension || isFirefoxExtension) ? origin : allowed[0];
	return {
		'Access-Control-Allow-Origin': o,
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Max-Age': '86400'
	};
}

function jsonResponse(data, status, request) {
	return new Response(JSON.stringify(data), {
		status: status || 200,
		headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
	});
}

function errorResponse(message, status, request) {
	return jsonResponse({ success: false, error: message }, status || 400, request);
}

/* ──────────────────────────────
 *  УТИЛИТЫ
 * ────────────────────────────── */
function generateToken() {
	const arr = new Uint8Array(32);
	crypto.getRandomValues(arr);
	return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

/*
 * Ленивая миграция: добавляет колонку scores.cards в существующих БД.
 * Запускается один раз за инстанс воркера (флаг в global). Безопасна —
 * ALTER TABLE с проверкой через PRAGMA. На свежих БД из schema.sql колонка
 * уже создана и эта функция выполнит no-op.
 */
let cardsColumnReady = false;
async function ensureCardsColumn(env) {
	if (cardsColumnReady) return;
	try {
		const info = await env.DB.prepare("PRAGMA table_info(scores)").all();
		const hasCards = (info.results || []).some(row => row.name === 'cards');
		if (!hasCards) {
			await env.DB.prepare("ALTER TABLE scores ADD COLUMN cards TEXT DEFAULT '{}'").run();
		}
		cardsColumnReady = true;
	} catch (e) {
		console.warn('[ensureCardsColumn]', e?.message || e);
	}
}

function getUpgradeCost(upg, count) {
	return Math.floor(upg.baseCost * Math.pow(1.15, count));
}

function calcKPS(upgrades) {
	let kps = 0;
	UPGRADES.forEach(u => {
		const c = (upgrades && upgrades[u.id]) || 0;
		if (u.kps) kps += u.kps * c;
	});
	return kps;
}

function calcClickValue(upgrades) {
	let val = 1;
	UPGRADES.forEach(u => {
		const c = (upgrades && upgrades[u.id]) || 0;
		if (u.clickBonus) val += u.clickBonus * c;
	});
	return val;
}

function calcTotalSpent(upgrades) {
	let spent = 0;
	UPGRADES.forEach(u => {
		const c = (upgrades && upgrades[u.id]) || 0;
		for (let i = 0; i < c; i++) spent += getUpgradeCost(u, i);
	});
	return spent;
}

function validateProgress(prev, next, now) {
	// Проверка на уменьшение
	if (next.totalKnowledge < prev.totalKnowledge - 0.1) return 'totalKnowledge decreased';
	if (next.clickCount < prev.clickCount) return 'clickCount decreased';
	if (next.knowledge < 0) return 'knowledge negative';

	// Проверка апгрейдов
	for (const u of UPGRADES) {
		const c = (next.upgrades && next.upgrades[u.id]) || 0;
		if (c < 0 || !Number.isInteger(c)) return `invalid upgrade count for ${u.id}`;
	}

	// Проверяем, что на апгрейды потрачено не больше, чем заработано
	const spent = calcTotalSpent(next.upgrades);
	if (spent > next.totalKnowledge * 1.5 + 100) {
		return 'upgrades cost exceeds total knowledge';
	}

	// Проверяем скорость прироста
	const deltaTime = Math.min(Math.max(now - prev.updated_at, 5), 3600); // 5с - 1ч
	const kps = calcKPS(next.upgrades);
	const clickVal = calcClickValue(next.upgrades);

	// Если прошло больше часа с последней синхронизации — разрешаем любой gain
	if ((now - prev.updated_at) > 3600) {
		return null; // OK — большой перерыв
	}

	const maxClickGain = clickVal * CLICKS_PER_SEC_LIMIT * deltaTime;
	const maxKPSGain = kps * deltaTime;
	const maxPossibleGain = (maxClickGain + maxKPSGain) * 2 + EVENT_BONUS_BUFFER;

	// Вычитаем заявленный офлайн-доход из actualGain
	const actualGain = next.totalKnowledge - prev.totalKnowledge;
	const offlineIncome = next.offlineIncome || 0;
	const sessionGain = Math.max(0, actualGain - offlineIncome);

	if (sessionGain > maxPossibleGain) {
		return `gain too high: +${Math.floor(sessionGain)} in ${deltaTime}s (max ${Math.floor(maxPossibleGain)}, offline ${Math.floor(offlineIncome)})`;
	}

	const clickDelta = next.clickCount - prev.clickCount;
	const maxClicks = CLICKS_PER_SEC_LIMIT * deltaTime * 1.5;
	if (clickDelta > maxClicks) {
		return `click rate too high: ${clickDelta} clicks in ${deltaTime}s`;
	}

	return null; // OK
}

/* ──────────────────────────────
 *  AUTH
 * ────────────────────────────── */
async function handleAuth(request, env) {
	const body = await request.json().catch(() => ({}));
	const { instudy_user_id, username } = body;

	if (!instudy_user_id || !username) {
		return errorResponse('instudy_user_id and username required', 400, request);
	}

	// Ищем пользователя
	const existing = await env.DB.prepare(
		'SELECT * FROM users WHERE instudy_user_id = ?'
	).bind(instudy_user_id).first();

	let token;
	if (existing) {
		token = existing.token;
		// Обновляем username если изменился
		if (existing.username !== username) {
			await env.DB.prepare('UPDATE users SET username = ? WHERE id = ?')
				.bind(username, existing.id).run();
		}
	} else {
		token = generateToken();
		await env.DB.prepare(
			'INSERT INTO users (instudy_user_id, username, token, created_at) VALUES (?, ?, ?, ?)'
		).bind(instudy_user_id, username, token, Math.floor(Date.now() / 1000)).run();
	}

	return jsonResponse({ success: true, token }, 200, request);
}

/* ──────────────────────────────
 *  ME
 * ────────────────────────────── */
async function handleMe(request, env) {
	const token = request.headers.get('Authorization')?.replace('Bearer ', '');
	if (!token) return errorResponse('Unauthorized', 401, request);

	await ensureCardsColumn(env);

	const user = await env.DB.prepare(
		'SELECT u.id, u.instudy_user_id, u.username, u.created_at, s.knowledge, s.total_knowledge, s.click_count, s.upgrades, s.cards, s.updated_at ' +
		'FROM users u LEFT JOIN scores s ON s.user_id = u.id WHERE u.token = ?'
	).bind(token).first();

	if (!user) return errorResponse('Invalid token', 401, request);

	return jsonResponse({
		success: true,
		user: {
			id: user.id,
			instudy_user_id: user.instudy_user_id,
			username: user.username,
			created_at: user.created_at,
			score: {
				knowledge: user.knowledge || 0,
				total_knowledge: user.total_knowledge || 0,
				click_count: user.click_count || 0,
				upgrades: user.upgrades ? JSON.parse(user.upgrades) : {},
				cards: user.cards ? JSON.parse(user.cards) : {},
				updated_at: user.updated_at || 0
			}
		}
	}, 200, request);
}

/* ──────────────────────────────
 *  SYNC
 * ────────────────────────────── */
async function handleSync(request, env) {
	const token = request.headers.get('Authorization')?.replace('Bearer ', '');
	if (!token) return errorResponse('Unauthorized', 401, request);

	await ensureCardsColumn(env);

	const body = await request.json().catch(() => ({}));
	const { knowledge, totalKnowledge, clickCount, upgrades, offlineIncome, cards } = body;

	if (typeof knowledge !== 'number' || typeof totalKnowledge !== 'number' || typeof clickCount !== 'number') {
		return errorResponse('Invalid score data', 400, request);
	}

	const user = await env.DB.prepare('SELECT id, last_sync_at FROM users WHERE token = ?')
		.bind(token).first();
	if (!user) return errorResponse('Invalid token', 401, request);

	// Получаем предыдущий скор
	const prev = await env.DB.prepare('SELECT * FROM scores WHERE user_id = ?')
		.bind(user.id).first();

	const now = Math.floor(Date.now() / 1000);
	const next = {
		knowledge,
		totalKnowledge,
		clickCount,
		upgrades: upgrades || {},
		offlineIncome: offlineIncome || 0,
		updated_at: now
	};

	// Валидация прогресса
	if (prev) {
		const err = validateProgress(
			{
				totalKnowledge: prev.total_knowledge,
				clickCount: prev.click_count,
				upgrades: prev.upgrades ? JSON.parse(prev.upgrades) : {},
				updated_at: prev.updated_at || Math.floor(user.last_sync_at)
			},
			next,
			now
		);
		if (err) {
			// Логируем подозрительную активность, но не блокируем полностью — записываем флаг
			console.warn(`[ANTICHEAT] user=${user.id} error=${err}`);
			// Можно вернуть 403, но для MVP просто игнорируем синхронизацию
			return jsonResponse({ success: false, error: err, anticheat: true }, 403, request);
		}
	}

	// Upsert score
	const cardsJson = JSON.stringify(cards && typeof cards === 'object' ? cards : {});
	if (prev) {
		await env.DB.prepare(
			'UPDATE scores SET knowledge=?, total_knowledge=?, click_count=?, upgrades=?, cards=?, updated_at=? WHERE user_id=?'
		).bind(knowledge, totalKnowledge, clickCount, JSON.stringify(upgrades || {}), cardsJson, now, user.id).run();
	} else {
		await env.DB.prepare(
			'INSERT INTO scores (user_id, knowledge, total_knowledge, click_count, upgrades, cards, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
		).bind(user.id, knowledge, totalKnowledge, clickCount, JSON.stringify(upgrades || {}), cardsJson, now).run();
	}

	// Обновляем last_sync_at
	await env.DB.prepare('UPDATE users SET last_sync_at = ? WHERE id = ?')
		.bind(now, user.id).run();

	// Записываем в историю каждые 10 минут (чтобы не спамить)
	const lastHistory = await env.DB.prepare(
		'SELECT recorded_at FROM score_history WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 1'
	).bind(user.id).first();

	if (!lastHistory || now - lastHistory.recorded_at > 600) {
		await env.DB.prepare(
			'INSERT INTO score_history (user_id, total_knowledge, recorded_at) VALUES (?, ?, ?)'
		).bind(user.id, totalKnowledge, now).run();
	}

	return jsonResponse({ success: true, synced_at: now }, 200, request);
}

/* ──────────────────────────────
 *  LEADERBOARD
 * ────────────────────────────── */
async function handleLeaderboard(request, env) {
	const url = new URL(request.url);
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
	const period = url.searchParams.get('period') || 'all'; // all | week | day

	let where = '';
	if (period === 'day') {
		where = 'WHERE s.updated_at > ' + (Math.floor(Date.now() / 1000) - 86400);
	} else if (period === 'week') {
		where = 'WHERE s.updated_at > ' + (Math.floor(Date.now() / 1000) - 604800);
	}

	const rows = await env.DB.prepare(
		'SELECT u.username, u.instudy_user_id, s.total_knowledge, s.click_count, s.updated_at ' +
		'FROM scores s JOIN users u ON u.id = s.user_id ' +
		where +
		' ORDER BY s.total_knowledge DESC LIMIT ?'
	).bind(limit).all();

	return jsonResponse({
		success: true,
		period,
		leaderboard: (rows.results || []).map((r, i) => ({
			rank: i + 1,
			username: r.username,
			instudy_user_id: r.instudy_user_id,
			total_knowledge: r.total_knowledge,
			click_count: r.click_count,
			updated_at: r.updated_at
		}))
	}, 200, request);
}

/* ──────────────────────────────
 *  HEARTBEAT (online)
 * ────────────────────────────── */
async function handleHeartbeat(request, env) {
	const token = request.headers.get('Authorization')?.replace('Bearer ', '');
	if (!token) return errorResponse('Unauthorized', 401, request);

	const user = await env.DB.prepare('SELECT id, username, instudy_user_id FROM users WHERE token = ?')
		.bind(token).first();
	if (!user) return errorResponse('Invalid token', 401, request);

	const key = `online:${user.instudy_user_id}`;
	await env.ONLINE_KV.put(key, JSON.stringify({
		username: user.username,
		last_seen: Math.floor(Date.now() / 1000)
	}), { expirationTtl: ONLINE_TTL_SECONDS });

	return jsonResponse({ success: true }, 200, request);
}

/* ──────────────────────────────
 *  ONLINE LIST
 * ────────────────────────────── */
async function handleOnline(request, env) {
	const list = await env.ONLINE_KV.list({ prefix: 'online:' });
	const now = Math.floor(Date.now() / 1000);
	const users = [];

	for (const key of list.keys || []) {
		try {
			const data = await env.ONLINE_KV.get(key.name, { type: 'json' });
			if (data && (now - data.last_seen) < ONLINE_TTL_SECONDS) {
				users.push({
					instudy_user_id: key.name.replace('online:', ''),
					username: data.username,
					last_seen: data.last_seen
				});
			}
		} catch (_) { /* skip */ }
	}

	return jsonResponse({ success: true, count: users.length, users }, 200, request);
}

/* ──────────────────────────────
 *  ROUTER
 * ────────────────────────────── */
export default {
	async fetch(request, env, ctx) {
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: corsHeaders(request.headers.get('Origin') || '')
			});
		}

		const url = new URL(request.url);
		const path = url.pathname;

		try {
			if (path === '/api/auth' && request.method === 'POST') {
				return await handleAuth(request, env);
			}
			if (path === '/api/me' && request.method === 'GET') {
				return await handleMe(request, env);
			}
			if (path === '/api/sync' && request.method === 'POST') {
				return await handleSync(request, env);
			}
			if (path === '/api/leaderboard' && request.method === 'GET') {
				return await handleLeaderboard(request, env);
			}
			if (path === '/api/heartbeat' && request.method === 'POST') {
				return await handleHeartbeat(request, env);
			}
			if (path === '/api/online' && request.method === 'GET') {
				return await handleOnline(request, env);
			}

			return jsonResponse({ success: false, error: 'Not found' }, 404, request);
		} catch (e) {
			console.error('[API ERROR]', e);
			return errorResponse('Internal error', 500, request);
		}
	}
};
