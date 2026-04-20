/**
 * Ambient types for Supabase Edge Functions (Deno runtime).
 * Used by editor/TypeScript only; deployed code still runs on Deno.
 */
declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};
