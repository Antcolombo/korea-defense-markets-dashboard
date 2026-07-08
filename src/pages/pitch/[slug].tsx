import Head from 'next/head'
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { PitchReadOnlyView } from '@/components/pitch/pitch-workbench'
import { getSharedStockPitch } from '@/lib/research/pitches'
import { getSourcedPriceSeries } from '@/lib/research/stockPitchSources'
import type { StockPitchRecord } from '@/types/pitch'

type Props = {
  record: StockPitchRecord
  prices: { date: string; ticker: string; price: number }[]
}

export const getServerSideProps: GetServerSideProps<Props> = async context => {
  const slug = Array.isArray(context.params?.slug) ? context.params?.slug[0] : context.params?.slug
  const token = typeof context.query.token === 'string' ? context.query.token : undefined
  if (!slug) return { notFound: true }
  const record = await getSharedStockPitch(slug, token)
  if (!record) return { notFound: true }
  return {
    props: {
      record,
      prices: await getSourcedPriceSeries(record.ticker)
    }
  }
}

export default function SharedPitchPage({ record, prices }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>{`${record.ticker} Stock Pitch`}</title>
        <meta name="description" content={`${record.ticker} shared stock pitch memo.`} />
      </Head>
      <PitchReadOnlyView record={record} prices={prices} />
    </>
  )
}
