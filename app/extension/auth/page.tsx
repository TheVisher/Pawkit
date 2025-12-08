'use client'

import { useEffect, useState, useRef } from 'react'
import { Loader2, CheckCircle2, XCircle, Copy, Check } from 'lucide-react'

export default function ExtensionAuthPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')
  const [token, setToken] = useState('')
  const [copied, setCopied] = useState(false)
  const [messageSent, setMessageSent] = useState(false)
  const authAttempted = useRef(false)

  useEffect(() => {
    // Check if opened from extension
    const params = new URLSearchParams(window.location.search)
    const fromExtension = params.get('source') === 'extension'

    if (!fromExtension) {
      setError('This page should only be accessed from the Pawkit browser extension.')
      setStatus('error')
      return
    }

    // Auto-authorize on page load
    if (!authAttempted.current) {
      authAttempted.current = true
      handleAuthorize()
    }
  }, [])

  const handleAuthorize = async () => {
    try {
      console.log('[ExtensionAuth] Generating token...')

      // Generate extension token
      const response = await fetch('/api/extension/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Important for session cookies
      })

      console.log('[ExtensionAuth] Token API response status:', response.status)

      if (!response.ok) {
        const text = await response.text()
        console.error('[ExtensionAuth] Token API error:', text)
        throw new Error('Failed to generate token. Are you logged in?')
      }

      const data = await response.json()
      console.log('[ExtensionAuth] Token generated successfully')

      setToken(data.token)
      setStatus('success')

      // Try to send to extension via window.opener
      console.log('[ExtensionAuth] window.opener:', window.opener ? 'exists' : 'null')

      if (window.opener) {
        try {
          const message = {
            type: 'PAWKIT_AUTH_SUCCESS',
            token: data.token
          }
          console.log('[ExtensionAuth] Sending postMessage:', message.type)

          // Send to both possible origins
          window.opener.postMessage(message, '*')
          setMessageSent(true)
          console.log('[ExtensionAuth] postMessage sent successfully')

          // Close window after a short delay
          setTimeout(() => {
            console.log('[ExtensionAuth] Closing window...')
            window.close()
          }, 2000)
        } catch (e) {
          console.error('[ExtensionAuth] postMessage failed:', e)
          // User can copy token manually
        }
      } else {
        console.log('[ExtensionAuth] No window.opener - user will copy manually')
      }
    } catch (err) {
      console.error('[ExtensionAuth] Authorization failed:', err)
      setError(err instanceof Error ? err.message : 'Authorization failed')
      setStatus('error')
    }
  }

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy token:', err)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
        {status === 'loading' && (
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-accent mx-auto" />
            <h1 className="text-xl font-semibold text-gray-100">Authorizing...</h1>
            <p className="text-sm text-gray-400">
              Generating secure token for the extension
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h1 className="text-xl font-semibold text-gray-100">Authorization Successful</h1>

            {messageSent ? (
              <p className="text-sm text-gray-400">
                Token sent to extension. This window will close automatically.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">
                  Copy this token and paste it in the extension settings:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={token}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm font-mono text-gray-300 truncate"
                  />
                  <button
                    onClick={copyToken}
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  You can close this window after copying.
                </p>
              </div>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4">
            <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h1 className="text-xl font-semibold text-gray-100">Authorization Failed</h1>
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Close Window
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
