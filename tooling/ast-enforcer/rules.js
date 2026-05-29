/**
 * AST Enforcer - Custom Runtime Guards & Architecture Fences
 * Detects bypasses of the Kernel Execution system.
 */

module.exports = {
  forbiddenImports: [
    {
      pattern: /^@supabase\/supabase-js$/,
      allowedIn: ['/packages/infrastructure', '/packages/kernel', '/tooling'],
      message: "CRITICAL VIOLATION: Direct usage of Supabase is forbidden outside the infrastructure and kernel boundary."
    },
    {
      pattern: /^@supabase\/ssr$/,
      allowedIn: ['/packages/infrastructure', '/packages/kernel', '/apps/web/src/app/(auth)', '/apps/web/src/middleware.ts'],
      message: "CRITICAL VIOLATION: Supabase SSR MUST NOT be imported directly into business logic or regular UI."
    }
  ]
};
