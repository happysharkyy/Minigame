// worker/mail.js — 通过 QQ 邮箱 SMTP 发送通知邮件 (Cloudflare Workers TCP sockets)
//
// Cloudflare Workers 禁止连接 25 端口, 因此使用 465 隐式 TLS。
// 凭据来自环境变量 (Worker Secret), 不写入仓库:
//   QQ_SMTP_PASS  QQ 邮箱「IMAP/SMTP 服务」开启后生成的 16 位授权码
// 发件人 / 收件人默认取 wrangler.jsonc 的 vars (MAIL_FROM / MAIL_TO)。

import { connect } from 'cloudflare:sockets';

const SMTP_HOST = 'smtp.qq.com';
const SMTP_PORT = 465;
const SMTP_TIMEOUT_MS = 12_000;

const b64 = (str) => {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

// RFC 2047 编码, 让中文主题/发件人名称在各邮件客户端正常显示
const encodeHeader = (value) => `=?UTF-8?B?${b64(value)}?=`;

// 头部注入防护
const stripBreaks = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').slice(0, 200);

function wrapBase64(base64) {
  return base64.replace(/(.{76})/g, '$1\r\n');
}

export function getMailConfig(env) {
  const user = env?.MAIL_FROM || env?.QQ_SMTP_USER || '';
  const to = env?.MAIL_TO || user;
  const pass = env?.QQ_SMTP_PASS || '';
  return { user, to, pass, configured: Boolean(user && pass) };
}

/**
 * 发送 HTML 邮件。失败时抛出异常, 由调用方决定是否静默。
 * @param {object} env  Worker 环境变量
 * @param {{ to?: string, subject: string, html: string }} message
 */
export async function sendMail(env, { to, subject, html }) {
  const config = getMailConfig(env);
  if (!config.configured) throw new Error('MAIL_NOT_CONFIGURED');
  const recipient = to || config.to;

  const socket = connect(
    { hostname: SMTP_HOST, port: SMTP_PORT },
    { secureTransport: 'on', allowHalfOpen: false }
  );

  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';
  let closed = false;

  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('SMTP_TIMEOUT')), SMTP_TIMEOUT_MS);
  });

  async function readLine() {
    for (;;) {
      const index = buffer.indexOf('\n');
      if (index !== -1) {
        const line = buffer.slice(0, index).replace(/\r$/, '');
        buffer = buffer.slice(index + 1);
        return line;
      }
      const { value, done } = await reader.read();
      if (done) throw new Error('SMTP_CONNECTION_CLOSED');
      buffer += decoder.decode(value, { stream: true });
    }
  }

  async function readReply() {
    const lines = [];
    for (;;) {
      const line = await readLine();
      if (!line) continue;
      lines.push(line);
      if (/^\d{3} /.test(line)) return lines;
    }
  }

  async function write(data) {
    await writer.write(encoder.encode(data));
  }

  async function expect(codes) {
    const lines = await readReply();
    const code = Number(lines[lines.length - 1].slice(0, 3));
    if (!codes.includes(code)) {
      throw new Error(`SMTP_${code}: ${lines.join(' | ').slice(0, 220)}`);
    }
    return lines;
  }

  const work = (async () => {
    await expect([220]);
    await write(`EHLO motionsensinggame.top\r\n`);
    await expect([250]);

    await write(`AUTH LOGIN\r\n`);
    await expect([334]);
    await write(`${b64(config.user)}\r\n`);
    await expect([334]);
    await write(`${b64(config.pass)}\r\n`);
    await expect([235]);

    await write(`MAIL FROM:<${config.user}>\r\n`);
    await expect([250]);
    await write(`RCPT TO:<${recipient}>\r\n`);
    await expect([250, 251]);
    await write(`DATA\r\n`);
    await expect([354]);

    const headers = [
      `From: ${encodeHeader('MOVE ARCADE')} <${config.user}>`,
      `To: <${recipient}>`,
      `Subject: ${encodeHeader(stripBreaks(subject))}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}@motionsensinggame.top>`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      wrapBase64(b64(html)),
      '',
      '.',
      '',
    ].join('\r\n');

    await write(headers);
    await expect([250]);
    await write('QUIT\r\n');
  })();

  try {
    await Promise.race([work, timeout]);
    closed = true;
  } finally {
    try {
      await writer.close();
    } catch {
      /* 连接已关闭 */
    }
    try {
      if (!closed) await reader.cancel();
    } catch {
      /* 忽略 */
    }
    try {
      socket.close();
    } catch {
      /* 忽略 */
    }
  }
}
