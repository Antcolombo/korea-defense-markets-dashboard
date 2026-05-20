import type { AppProps } from 'next/app'
import Head from 'next/head'
import { AppShell } from '@/components/layout/AppShell'
import '@/styles/globals.css'

export function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Asia Macro Research OS</title>
        <meta name="description" content="Public-source Korea macro and market research workbench for liquid U.S.-accessible trade expressions" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <AppShell>
        <Component {...pageProps} />
      </AppShell>
    </>
  )
}

export default App
