/**
 * Logger estruturado.
 * Dev: saída legível no terminal.
 * Prod: JSON por linha (compatível com Vercel / Sentry).
 */

type LogLevel   = 'debug' | 'info' | 'warn' | 'error'
type LogContext = Record<string, unknown>

const ICONS: Record<LogLevel, string> = {
  debug: '🐛',
  info:  '📋',
  warn:  '⚠️ ',
  error: '🔴',
}

function emit(level: LogLevel, msg: string, ctx?: LogContext): void {
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    const fn = level === 'error' ? console.error
             : level === 'warn'  ? console.warn
             : console.log
    fn(`${ICONS[level]} [${level.toUpperCase()}] ${msg}`, ctx ?? '')
  } else {
    const entry = JSON.stringify({
      level,
      msg,
      ts: new Date().toISOString(),
      ...ctx,
    })
    const fn = level === 'error' ? console.error
             : level === 'warn'  ? console.warn
             : console.log
    fn(entry)
  }
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => emit('debug', msg, ctx),
  info:  (msg: string, ctx?: LogContext) => emit('info',  msg, ctx),
  warn:  (msg: string, ctx?: LogContext) => emit('warn',  msg, ctx),
  error: (msg: string, ctx?: LogContext) => emit('error', msg, ctx),
}
