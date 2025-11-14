'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary
 * 자식 컴포넌트에서 발생한 JavaScript 에러를 잡아서
 * 전체 앱이 중단되는 것을 방지합니다.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // 다음 렌더링에서 폴백 UI를 표시하도록 상태를 업데이트합니다.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 에러 로깅 서비스에 전송할 수 있습니다
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-primary, #ffffff)',
            color: 'var(--text-primary, #000000)',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              padding: '2rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary, #f5f5f5)',
            }}
          >
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
              ⚠️ 오류가 발생했습니다
            </h1>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary, #666666)' }}>
              죄송합니다. 예상치 못한 오류가 발생했습니다.
              <br />
              페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details
                style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  backgroundColor: '#fff',
                  borderRadius: '4px',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  border: '1px solid #ddd',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                  에러 상세 정보 (개발 모드)
                </summary>
                <pre
                  style={{
                    marginTop: '0.5rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {this.state.error.toString()}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            )}

            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '1.5rem',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                color: '#fff',
                backgroundColor: '#0ea5e9',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#0284c7';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#0ea5e9';
              }}
            >
              페이지 새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
