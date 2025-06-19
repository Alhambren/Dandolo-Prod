import fetch from 'node-fetch';

const API_KEY = 'VJs_Ws3nVROpmjS39T_O471HNXsPjOCaMvKCGRW3QW'; // replace with your key if needed

async function main() {
  const res = await fetch('https://api.venice.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${API_KEY}` }
  });
  if (!res.ok) {
    console.error('Failed to fetch models:', res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  for (const model of data.data) {
    console.log(`ID: ${model.id} | Type: ${model.type} | Name: ${model.name || ''}`);
  }
}

main(); 