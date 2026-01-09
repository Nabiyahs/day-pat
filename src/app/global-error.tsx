'use client'

import { useEffect } from 'react'

/**
 * Global Error Boundary for Root Layout Errors
 *
 * This catches errors that occur in the root layout itself.
 * Note: This component must define its own <html> and <body> tags
 * because it replaces the entire root layout when an error occurs.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error details for debugging
    console.error('[GlobalError] Root layout error:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    })
  }, [error])

  const handleReset = () => {
    try {
      reset()
    } catch {
      // If reset fails, force reload
      window.location.reload()
    }
  }

  const handleGoHome = () => {
    try {
      window.location.href = '/'
    } catch {
      window.location.reload()
    }
  }

  return (
    <html lang="en">
      <head>
        <title>Error - DayPat</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <style dangerouslySetInnerHTML={{ __html: `
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(to bottom right, #fffbeb, #fefce8, #fff7ed);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container { max-width: 400px; width: 100%; text-align: center; }
          .title {
            font-family: 'Caveat', cursive;
            font-size: 3rem;
            font-weight: 700;
            color: #F27430;
            margin-bottom: 1.5rem;
          }
          .card {
            background: rgba(255,255,255,0.8);
            backdrop-filter: blur(10px);
            border-radius: 1.5rem;
            padding: 2rem;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          }
          .icon {
            width: 64px; height: 64px;
            background: #fee2e2;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1rem;
          }
          .icon svg { width: 32px; height: 32px; color: #ef4444; }
          h2 { font-size: 1.25rem; font-weight: 700; color: #1f2937; margin-bottom: 0.5rem; }
          p { color: #6b7280; font-size: 0.875rem; margin-bottom: 1.5rem; }
          .btn {
            display: block;
            width: 100%;
            padding: 0.75rem 1rem;
            border-radius: 0.75rem;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
            margin-bottom: 0.75rem;
          }
          .btn-primary {
            background: #f97316;
            color: white;
          }
          .btn-primary:hover { background: #ea580c; }
          .btn-secondary {
            background: #f3f4f6;
            color: #374151;
          }
          .btn-secondary:hover { background: #e5e7eb; }
          .footer { color: #9ca3af; font-size: 0.75rem; margin-top: 1.5rem; }
          .error-detail {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 0.5rem;
            padding: 0.75rem;
            margin-bottom: 1.5rem;
            text-align: left;
          }
          .error-detail code {
            font-family: monospace;
            font-size: 0.75rem;
            color: #dc2626;
            word-break: break-all;
          }
        `}} />
      </head>
      <body>
        <div className="container">
          <h1 className="title">DayPat</h1>
          <div className="card">
            <div className="icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2>Something went wrong</h2>
            <p>We apologize for the inconvenience. Please try again.</p>

            {process.env.NODE_ENV === 'development' && (
              <div className="error-detail">
                <code>{error.message}</code>
              </div>
            )}

            <button className="btn btn-primary" onClick={handleReset}>
              Try Again
            </button>
            <button className="btn btn-secondary" onClick={handleGoHome}>
              Go to Home
            </button>
          </div>
          <p className="footer">
            If this problem persists, please clear your browser cache.
          </p>
        </div>
      </body>
    </html>
  )
}
