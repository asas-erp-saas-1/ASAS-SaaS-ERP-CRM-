type LogLevel = 'info' | 'warn' | 'error' | 'fatal' | 'debug';

interface LogContext {
  tenantId?: string;
  userId?: string;
  traceId?: string;
  [key: string]: any;
}

export class Logger {
  private static formatLog(level: LogLevel, message: string, context?: LogContext) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    });
  }

  static info(message: string, context?: LogContext) {
    console.log(this.formatLog('info', message, context));
  }

  static warn(message: string, context?: LogContext) {
    console.warn(this.formatLog('warn', message, context));
  }

  static error(message: string, error?: Error, context?: LogContext) {
    console.error(this.formatLog('error', message, { 
      ...context, 
      error: error?.message, 
      stack: error?.stack 
    }));
  }

  static fatal(message: string, error?: Error, context?: LogContext) {
    console.error(this.formatLog('fatal', message, { 
      ...context, 
      error: error?.message, 
      stack: error?.stack 
    }));
  }

  static debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatLog('debug', message, context));
    }
  }
}
