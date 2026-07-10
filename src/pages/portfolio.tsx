import Head from 'next/head'
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { PortfolioView } from '@/features/decisions/components/decision-workbench'
import { listPublicInvestmentDecisions } from '@/lib/research/decisions'
import type { InvestmentDecisionRecord } from '@/types/decision'

type Props = {
  decisions: InvestmentDecisionRecord[]
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  return {
    props: {
      decisions: await listPublicInvestmentDecisions()
    }
  }
}

export default function PortfolioPage({ decisions }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Investment Decision Paper Book</title>
        <meta name="description" content="Public paper-book audit trail: variant view, evidence, risk, outcome, and lessons." />
      </Head>
      <PortfolioView decisions={decisions} />
    </>
  )
}
