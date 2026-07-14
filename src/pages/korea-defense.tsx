import Head from 'next/head'
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { loadWorkspacePage, type WorkspacePageProps } from '@/features/workspace/loaders'
import { TerminalWorkspace } from '@/shell/terminal/terminal-shell'

export const getServerSideProps: GetServerSideProps<WorkspacePageProps> = async context => ({
  props: await loadWorkspacePage({ ...context.query, module: 'korea-defense' })
})

export default function KoreaDefensePage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Korea Defense Markets | Interview Case Study</title>
        <meta
          name="description"
          content="Sourced Korea and Indo-Pacific defense market intelligence: catalyst transmission, Korea beta, U.S. supplier confirmation, crowding, and invalidation."
        />
      </Head>
      <TerminalWorkspace {...props} />
    </>
  )
}
