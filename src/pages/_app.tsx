import type { AppProps } from 'next/app'
import Head from 'next/head'
import '@/styles/globals.css'
import '@/styles/terminal-workspace.css'

export function App({ Component, pageProps }: AppProps) {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Head>
        <title>LIQUIDCHAIN Market Terminal</title>
        <meta name="description" content="Source-aware market terminal for flow, positioning, crowding, validation, and PM reports." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </div>
  )
}

export default App
