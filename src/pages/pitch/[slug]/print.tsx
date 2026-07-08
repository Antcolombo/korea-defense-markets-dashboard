import Head from 'next/head'
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { PitchPrintMemo } from '@/components/pitch/pitch-print-memo'
import { getSharedStockPitch } from '@/lib/research/pitches'
import type { StockPitchRecord } from '@/types/pitch'

type Props = {
  record: StockPitchRecord
}

export const getServerSideProps: GetServerSideProps<Props> = async context => {
  const slug = Array.isArray(context.params?.slug) ? context.params?.slug[0] : context.params?.slug
  const token = typeof context.query.token === 'string' ? context.query.token : undefined
  if (!slug) return { notFound: true }
  const record = await getSharedStockPitch(slug, token)
  if (!record) return { notFound: true }
  return { props: { record } }
}

export default function PitchPrintPage({ record }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>{`${record.ticker} Stock Pitch Print`}</title>
        <meta name="description" content={`${record.ticker} one-page stock pitch export.`} />
      </Head>
      <PitchPrintMemo record={record} />
    </>
  )
}
