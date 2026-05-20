import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/ui/Section'
import { Card, CardHeader } from '@/components/ui/Card'
import { ThemeCard } from '@/components/themes/ThemeCard'
import { ExposureMap } from '@/components/themes/ExposureMap'
import { getThemes } from '@/lib/data/getThemes'

export function ThemesPage() {
  const themes = getThemes()

  return (
    <>
      <PageHeader
        eyebrow="Exposure map"
        title="Defense Theme Exposure Map"
        description="Map public-source defense themes to market channels, related companies, ETFs/assets, catalysts, risks, and research implications."
      />
      <Section>
        <Card>
          <CardHeader title="Theme-To-Market Matrix" eyebrow="Derived exposure mapping" />
          <ExposureMap themes={themes} />
        </Card>
      </Section>
      <Section className="pt-0">
        <div className="grid gap-5 lg:grid-cols-2">
          {themes.map(theme => <ThemeCard key={theme.id} theme={theme} />)}
        </div>
      </Section>
    </>
  )
}

export default ThemesPage
