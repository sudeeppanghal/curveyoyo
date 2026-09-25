
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/system',
  method: 'GET',
  headers: {
    'x-admin-secret': 'JaatRam@#9211'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(data);
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.end();
