import Head from 'next/head'
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { DecisionWorkbench } from '@/features/decisions/components/decision-workbench'
import { getInvestmentDecision } from '@/lib/research/decisions'
import type { InvestmentDecisionRecord, InvestmentDecisionSummary } from '@/types/decision'

type Props = {
  decision: InvestmentDecisionRecord
  decisions: InvestmentDecisionSummary[]
}

export const getServerSideProps: GetServerSideProps<Props> = async context => {
  const slug = typeof context.params?.slug === 'string' ? context.params.slug : ''
  const decision = await getInvestmentDecision(slug)
  if (!decision) return { notFound: true }
  return {
    props: {
      decision,
      decisions: [decisionSummary(decision)]
    }
  }
}

export default function DecisionDetailPage({ decision, decisions }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>{`${decision.ticker} Investment Decision`}</title>
        <meta name="description" content={`${decision.ticker} investment decision audit trail.`} />
      </Head>
      <main className="terminal-v2 min-h-screen bg-background p-3 text-foreground">
        <div className="mx-auto max-w-7xl">
          <DecisionWorkbench
            decisions={decisions}
            activeDecision={decision}
            initialTicker={decision.ticker}
            sourceSummary={decision.sourceSnapshot?.summary ?? 'Source snapshot pending.'}
          />
        </div>
      </main>
    </>
  )
}

function decisionSummary(decision: InvestmentDecisionRecord): InvestmentDecisionSummary {
  return {
    id: decision.id,
    slug: decision.slug,
    ticker: decision.ticker,
    companyName: decision.companyName,
    status: decision.status,
    decision: decision.decision,
    variantView: decision.variantView,
    expectedReturn: decision.expectedReturn,
    downside: decision.downside,
    outcomeReturn: decision.outcomeReturn,
    lesson: decision.lesson,
    isPublic: decision.isPublic,
    pmRead: decision.pmRead,
    createdAt: decision.createdAt,
    updatedAt: decision.updatedAt
  }
}
