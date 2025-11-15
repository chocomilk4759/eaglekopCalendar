/**
 * Type Guard 유틸리티 함수
 *
 * TypeScript의 타입 좁히기(Type Narrowing)를 위한 가드 함수들
 */

/**
 * Error 타입 가드
 *
 * @param e - 검사할 값 (unknown 타입)
 * @returns Error 객체이면 true, 아니면 false
 *
 * @example
 * ```ts
 * try {
 *   // some operation
 * } catch (e: unknown) {
 *   if (isError(e)) {
 *     console.error(e.message); // TypeScript knows e is Error
 *   }
 * }
 * ```
 */
export function isError(e: unknown): e is Error {
  return e instanceof Error;
}

/**
 * Supabase Row 타입 가드
 *
 * @param row - 검사할 값 (unknown 타입)
 * @returns object이고 null이 아니면 true, 아니면 false
 *
 * @example
 * ```ts
 * const data: unknown = await supabase.from('notes').select();
 * if (isSupabaseRow(data)) {
 *   console.log(data.id); // TypeScript knows data is Record<string, unknown>
 * }
 * ```
 */
export function isSupabaseRow(row: unknown): row is Record<string, unknown> {
  return typeof row === 'object' && row !== null && !Array.isArray(row);
}
