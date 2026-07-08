import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf
} from '@react-pdf/renderer'
import type { StockReport } from '@/lib/research/types'

const styles = StyleSheet.create({
  page: {
    padding: 32,
    backgroundColor: '#061515',
    color: '#f8fffd',
    fontSize: 10,
    fontFamily: 'Helvetica'
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#50d2c1',
    paddingBottom: 12,
    marginBottom: 16
  },
  eyebrow: {
    color: '#50d2c1',
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4
  },
  title: {
    fontSize: 24,
    fontWeight: 700
  },
  section: {
    borderWidth: 1,
    borderColor: '#ffffff1f',
    padding: 10,
    marginBottom: 10
  },
  sectionTitle: {
    color: '#50d2c1',
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6
  },
  body: {
    lineHeight: 1.5,
    color: '#d7fffa'
  },
  bullet: {
    marginTop: 4,
    color: '#d7fffa'
  }
})

function StockReportPdfDocument({ report }: { report: StockReport }) {
  const sections = [...report.evidence, report.positioning, report.catalysts]
  return (
    <Document title={`${report.ticker} LIQUIDCHAIN report`}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>LIQUIDCHAIN sourced report</Text>
          <Text style={styles.title}>{report.ticker} / {report.companyName}</Text>
          <Text style={styles.body}>{report.summary}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Variant View</Text>
          <Text style={styles.body}>{report.variantView}</Text>
        </View>
        {sections.slice(0, 5).map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.body}>{section.summary}</Text>
            {section.bullets.slice(0, 4).map(item => <Text key={item} style={styles.bullet}>- {item}</Text>)}
          </View>
        ))}
      </Page>
    </Document>
  )
}

export async function downloadStockReportPdf(report: StockReport) {
  const blob = await pdf(<StockReportPdfDocument report={report} />).toBlob()
  downloadBlob(blob, `${report.ticker.toLowerCase()}-report.pdf`)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
