/**
 * 에러 핸들링 유틸리티
 * - 사용자에게 친화적인 메시지 표시
 * - 콘솔에 상세 에러 로깅
 */

export type ErrorContext = {
  action: string;      // 예: "이미지 업로드", "노트 저장"
  detail?: string;     // 추가 컨텍스트
  error?: unknown;     // 원본 에러 객체
};

/**
 * 에러를 사용자에게 표시하고 콘솔에 로깅
 */
export function handleError(context: ErrorContext): void {
  const { action, detail, error } = context;

  // 콘솔 로깅 (디버깅용)
  console.error(`[Error] ${action}`, {
    detail,
    error,
    timestamp: new Date().toISOString(),
  });

  // 사용자 메시지 구성
  let message = `${action} 중 오류가 발생했습니다.`;

  if (error instanceof Error) {
    // 네트워크 에러
    if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
      message += '\n네트워크 연결을 확인해주세요.';
    }
    // Supabase 에러
    else if (error.message.includes('JWT') || error.message.includes('auth')) {
      message += '\n로그인이 필요하거나 세션이 만료되었습니다.';
    }
    // 일반 에러
    else if (detail) {
      message += `\n${detail}`;
    }
  } else if (detail) {
    message += `\n${detail}`;
  }

  // 사용자에게 표시 (브라우저 환경에서만)
  if (typeof window !== 'undefined') {
    alert(message);
  }
}

/**
 * 성공 메시지 표시 (향후 Toast UI로 업그레이드 가능)
 */
export function showSuccess(message: string): void {
  console.log(`[Success] ${message}`);
  // 현재는 조용히 처리, 향후 Toast 라이브러리 추가 시 여기서 호출
}

/**
 * Promise 에러를 안전하게 처리
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context: Omit<ErrorContext, 'error'>
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    handleError({ ...context, error });
    return null;
  }
}
