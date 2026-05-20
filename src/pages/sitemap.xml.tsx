import type { GetServerSideProps } from 'next'

const routes = [
  '/',
  '/dashboard',
  '/markets',
  '/events',
  '/source-audit',
  '/research/korea-defense-memo',
  '/research/hii-stock-pitch',
  '/methodology',
  '/about'
]

function Sitemap() {
  return null
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(route => `  <url><loc>${baseUrl}${route}</loc></url>`).join('\n')}
</urlset>`

  res.setHeader('Content-Type', 'application/xml')
  res.write(body)
  res.end()

  return { props: {} }
}

export default Sitemap
