'use client'

import { SWRConfig } from 'swr'
import { ReactNode } from 'react'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: true, // Refresh data when user returns to tab
        revalidateOnReconnect: true, // Refresh when internet reconnects
        dedupingInterval: 2000, // Deduplicate requests within 2 seconds
        focusThrottleInterval: 5000, // Don't revalidate more than once per 5 seconds on focus
        errorRetryCount: 3, // Retry failed requests 3 times
        errorRetryInterval: 5000, // Wait 5 seconds between retries
      }}
    >
      {children}
    </SWRConfig>
  )
}
