import { BetaAnalyticsDataClient } from '@google-analytics/data';
import path from 'path';

// Set credentials environment variable explicitly
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(process.cwd(), 'google-credentials.json');

const propertyId = '356601610';
const analyticsDataClient = new BetaAnalyticsDataClient();

async function testConnection() {
  console.log(`Testando conexão com GA4 Property: ${propertyId}...`);
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }],
    });

    console.log('\n✅ CONEXÃO COM O GOOGLE ANALYTICS BATEU COM SUCESSO!');
    console.log('Dados de ontem retornados pelo GA4:');
    if (response.rows && response.rows.length > 0) {
      response.rows.forEach(row => {
        console.log(`- Data: ${row.dimensionValues[0].value}, Sessões: ${row.metricValues[0].value}`);
      });
    } else {
      console.log('Sem dados registrados para ontem.');
    }
  } catch (err) {
    console.error('\n❌ ERRO DE CONEXÃO COM O GOOGLE ANALYTICS:');
    console.error(err.message);
    if (err.message.includes('permission') || err.message.includes('caller does not have permission')) {
      console.error('\n👉 DICA: Certifique-se de que adicionou o e-mail da conta de serviço como "Leitor" nas configurações de acesso à Propriedade no Google Analytics.');
    }
  }
}

testConnection();
