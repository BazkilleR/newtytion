/**
 * Postgres error code of a failed query, if any. Drizzle wraps driver errors
 * and puts the original `pg` error in `cause`.
 */
export function pgErrorCode(err) {
  return err?.code ?? err?.cause?.code;
}

export const PG_FOREIGN_KEY_VIOLATION = "23503";

export const PG_UNIQUE_VIOLATION = "23505";
