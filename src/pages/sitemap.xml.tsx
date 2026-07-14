import type { GetServerSideProps } from 'next'

const routes = [
  '/',
  '/report/NVDA',
  '/?module=rotation',
  '/?module=baskets',
  '/?module=positioning',
  '/?module=crowding',
  '/?module=validation',
  '/?module=stock-pitch',
  '/?module=decision-log',
  '/?module=event-study',
  '/?module=paper-book',
  '/?module=risk-lens',
  '/?module=source-audit',
  '/korea-defense',
  '/?module=methodology',
  '/?module=stock-report&ticker=NVDA'
]

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function Sitemap() {
  return null
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(route => `  <url><loc>${escapeXml(`${baseUrl}${route}`)}</loc></url>`).join('\n')}
</urlset>`

  res.setHeader('Content-Type', 'application/xml')
  res.write(body)
  res.end()

  return { props: {} }
}

export default Sitemap
