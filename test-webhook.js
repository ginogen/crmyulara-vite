// Script de prueba para el webhook de Make con reintentos
const https = require('https');
const http = require('http');

// Configuración
const WEBHOOK_URL = 'https://crmyulara.netlify.app/.netlify/functions/make-webhook';
const WEBHOOK_SECRET = process.env.MAKE_WEBHOOK_SECRET || 'test-secret';

// Datos de prueba
const testData = {
  organization_id: 'a8121141-a040-41fe-9ddb-338f84e26da2',
  branch_id: 'd211268e-06e5-4368-a8fe-16d7a01f88f5',
  form_id: '123456789',
  facebook_lead_id: `test_${Date.now()}`,
  page_id: 'test_page',
  auto_convert: true,
  lead_data: {
    full_name: 'Juan Pérez',
    email: 'juan.perez@example.com',
    phone: '+34612345678',
    province: 'Madrid',
    pax_count: 2,
    estimated_travel_date: '2024-08-15',
    origin: 'Facebook Ads'
  }
};

function makeRequest(data, attempt = 1) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    console.log(`\n=== Intento ${attempt} ===`);
    console.log('URL:', WEBHOOK_URL);
    console.log('Secret:', WEBHOOK_SECRET.substring(0, 10) + '...');
    console.log('Data length:', postData.length);
    console.log('Data preview:', postData.substring(0, 200) + '...');
    
    const url = new URL(WEBHOOK_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-webhook-secret': WEBHOOK_SECRET,
        'User-Agent': 'Test-Webhook/1.0'
      }
    };
    
    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Headers:', res.headers);
        console.log('Response:', responseData);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, data: responseData });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error.message);
      reject(error);
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.write(postData);
    req.end();
  });
}

async function testWebhook() {
  console.log('🧪 Iniciando prueba del webhook...');
  console.log('URL:', WEBHOOK_URL);
  console.log('Secret configurado:', !!WEBHOOK_SECRET);
  
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n🔄 Intento ${attempt}/${maxRetries}`);
      
      const result = await makeRequest(testData, attempt);
      
      console.log('✅ Éxito!');
      console.log('Status:', result.statusCode);
      
      try {
        const response = JSON.parse(result.data);
        console.log('Response parsed:', response);
        
        if (response.success) {
          console.log('🎉 Webhook funcionando correctamente!');
          return;
        } else {
          console.log('⚠️ Webhook respondió pero con error:', response.error);
        }
      } catch (parseError) {
        console.log('⚠️ No se pudo parsear la respuesta como JSON:', result.data);
      }
      
      return;
      
    } catch (error) {
      lastError = error;
      console.error(`❌ Error en intento ${attempt}:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(`⏳ Esperando ${Math.round(delay)}ms antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('💥 Todos los intentos fallaron. Último error:', lastError.message);
  process.exit(1);
}

// Ejecutar la prueba
testWebhook().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
}); 