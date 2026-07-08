import { useState } from 'react'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { QueryClientProvider } from '@tanstack/react-query'
import { NuqsAdapter } from 'nuqs/adapters/next/pages'
import { createResearchQueryClient } from '@/lib/research/client'
import '@mdxeditor/editor/style.css'
import '@/styles/globals.css'
import '@/styles/terminal-workspace.css'
import '@/styles/pitch-print.css'

export function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => createResearchQueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <div className="dark min-h-screen bg-background text-foreground">
          <Head>
            <title>LIQUIDCHAIN Market Terminal</title>
            <meta name="description" content="Source-aware PM research workbench for pitches, decisions, event studies, validation, paper book, risk, and data audit." />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
          </Head>
          <Component {...pageProps} />
        </div>
      </NuqsAdapter>
    </QueryClientProvider>
  )
}

export default App
