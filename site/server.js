// Zero-dependency server: serves the site, stores content in data/, powers /admin.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000;
const ROOT = __dirname, PUB = path.join(ROOT, 'public'), DATA = path.join(ROOT, 'data');
const F = n => path.join(DATA, n);
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
fs.mkdirSync(DATA, { recursive: true }); fs.mkdirSync(path.join(PUB, 'uploads'), { recursive: true });
if (!fs.existsSync(F('content.json'))) fs.copyFileSync(path.join(ROOT, 'content.default.json'), F('content.json'));
if (!fs.existsSync(F('enquiries.json'))) fs.writeFileSync(F('enquiries.json'), '[]');
const hash = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
if (!fs.existsSync(F('admin.json'))) {
  const salt = crypto.randomBytes(16).toString('hex'), pw = process.env.ADMIN_PASSWORD || 'ChangeMe@123';
  fs.writeFileSync(F('admin.json'), JSON.stringify({ salt, hash: hash(pw, salt), secret: crypto.randomBytes(32).toString('hex') }));
  console.log('Admin created. Password:', pw, '- change it after first login.');
}
const admin = () => JSON.parse(fs.readFileSync(F('admin.json')));
const sign = v => { const a = admin(); return v + '.' + crypto.createHmac('sha256', a.secret).update(v).digest('hex'); };
const authed = req => {
  const m = /sid=([^;]+)/.exec(req.headers.cookie || ''); if (!m) return false;
  const [exp, sig] = decodeURIComponent(m[1]).split('.'); if (!exp || !sig) return false;
  const ok = sign(exp).split('.')[1];
  return ok.length === sig.length && crypto.timingSafeEqual(Buffer.from(ok), Buffer.from(sig)) && Date.now() < +exp;
};
const tries = {};
const json = (res, code, obj, h = {}) => { res.writeHead(code, { 'Content-Type': 'application/json', ...h }); res.end(JSON.stringify(obj)); };
const body = (req, max = 8e6) => new Promise((ok, no) => { let b = '', n = 0; req.on('data', c => { n += c.length; if (n > max) { no(new Error('too big')); req.destroy(); } else b += c; }); req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { no(e); } }); });

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x'), p = url.pathname, ip = req.socket.remoteAddress;
    if (p === '/api/content' && req.method === 'GET') return json(res, 200, JSON.parse(fs.readFileSync(F('content.json'))));
    if (p === '/api/enquiry' && req.method === 'POST') {
      const b = await body(req, 2e4), list = JSON.parse(fs.readFileSync(F('enquiries.json')));
      if (!b.name || !b.phone) return json(res, 400, { error: 'Name and phone required' });
      if (list.filter(e => e.ip === ip && Date.now() - e.t < 6e4).length > 2) return json(res, 429, { error: 'Please wait a minute' });
      list.unshift({ t: Date.now(), ip, name: String(b.name).slice(0, 80), phone: String(b.phone).slice(0, 20), email: String(b.email || '').slice(0, 80), goal: String(b.goal || '').slice(0, 60), message: String(b.message || '').slice(0, 800) });
      fs.writeFileSync(F('enquiries.json'), JSON.stringify(list.slice(0, 1000))); return json(res, 200, { ok: true });
    }
    if (p === '/api/login' && req.method === 'POST') {
      if ((tries[ip] || 0) >= 8) return json(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
      const b = await body(req, 1e3), a = admin();
      if (hash(String(b.password || ''), a.salt) !== a.hash) { tries[ip] = (tries[ip] || 0) + 1; setTimeout(() => delete tries[ip], 9e5); return json(res, 401, { error: 'Wrong password' }); }
      const sid = sign(String(Date.now() + 6048e5)); delete tries[ip];
      return json(res, 200, { ok: true }, { 'Set-Cookie': `sid=${encodeURIComponent(sid)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800` });
    }
    if (p === '/api/logout') return json(res, 200, { ok: true }, { 'Set-Cookie': 'sid=; Path=/; Max-Age=0' });
    if (p.startsWith('/api/admin/')) {
      if (!authed(req)) return json(res, 401, { error: 'Login required' });
      if (p === '/api/admin/check') return json(res, 200, { ok: true });
      if (p === '/api/admin/content' && req.method === 'PUT') { const b = await body(req, 5e5); fs.writeFileSync(F('content.json'), JSON.stringify(b, null, 2)); return json(res, 200, { ok: true }); }
      if (p === '/api/admin/enquiries') return json(res, 200, JSON.parse(fs.readFileSync(F('enquiries.json'))));
      if (p === '/api/admin/upload' && req.method === 'POST') {
        const b = await body(req, 8e6), m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(b.data || '');
        if (!m) return json(res, 400, { error: 'JPG, PNG or WEBP only' });
        const name = crypto.randomBytes(6).toString('hex') + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]);
        fs.writeFileSync(path.join(PUB, 'uploads', name), Buffer.from(m[2], 'base64')); return json(res, 200, { url: '/uploads/' + name });
      }
      if (p === '/api/admin/password' && req.method === 'POST') {
        const b = await body(req, 1e3), a = admin();
        if (hash(String(b.old || ''), a.salt) !== a.hash) return json(res, 401, { error: 'Current password is wrong' });
        if (String(b.new || '').length < 8) return json(res, 400, { error: 'Use at least 8 characters' });
        const salt = crypto.randomBytes(16).toString('hex'); fs.writeFileSync(F('admin.json'), JSON.stringify({ ...a, salt, hash: hash(b.new, salt) })); return json(res, 200, { ok: true });
      }
      return json(res, 404, { error: 'Not found' });
    }
    let f = p === '/admin' ? '/admin.html' : p === '/' ? '/index.html' : p;
    const full = path.normalize(path.join(PUB, decodeURIComponent(f)));
    if (!full.startsWith(PUB) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream', 'Cache-Control': f.startsWith('/uploads') ? 'public,max-age=86400' : 'no-cache' });
    fs.createReadStream(full).pipe(res);
  } catch (e) { json(res, 500, { error: 'Server error' }); }
}).listen(PORT, () => console.log('Running on port ' + PORT));
