// Script de prueba para el webhook de Make
const https = require('https');

const testData = {
  "organization_id": "a8121141-a040-41fe-9ddb-338f84e26da2",
  "branch_id": "d211268e-06e5-4368-a8fe-16d7a01f88f5",
  "form_id": "123456789",
  "page_id": "123456789",
  "facebook_lead_id": "11111",
  "lead_data": {
    "full_name": "𝗖𝗮𝘀𝗮 𝗱𝗲 𝗰𝗮𝗺𝗽𝗼 \"𝗘𝗹 𝗖𝗼𝗿𝗿𝗮𝗹\"",
    "email": "aleruiz1965@live.com",
    "phone": "+541159448793",
    "province": "Córdoba",
    "pax_count": "1",
    "estimated_travel_date": "Marzo",
    "origin": "Campaña GRECIA con formulario (22/05/25)"
  },
  "auto_convert": true,
  "assigned_to": null
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'yulara-crm.netlify.app',
  port: 443,
  path: '/.netlify/functions/make-webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'x-webhook-secret': '9655f54150afeabe2d8a0162e3c12fe64f36ec322802dd62d6312444399bf9ac'
  }
};

console.log('Enviando petición de prueba...');
console.log('URL:', `https://${options.hostname}${options.path}`);
console.log('Datos:', JSON.stringify(testData, null, 2));

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Respuesta:', data);
    try {
      const response = JSON.parse(data);
      console.log('Respuesta parseada:', JSON.stringify(response, null, 2));
    } catch (e) {
      console.log('Respuesta no es JSON válido');
    }
  });
});

req.on('error', (e) => {
  console.error('Error en la petición:', e);
});

req.write(postData);
req.end(); 