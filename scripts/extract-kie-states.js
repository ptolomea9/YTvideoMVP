const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const execution = JSON.parse(data[0].text);

console.log('Top level keys:', Object.keys(execution));
console.log('execution.data keys:', Object.keys(execution.data || {}));

// Check nodes directly
const nodes = execution.data?.nodes;
if (nodes) {
  console.log('Available nodes:', Object.keys(nodes));
  const kieNode = nodes['Get image from kie'];
  if (kieNode) {
    console.log('Kie node data keys:', Object.keys(kieNode));
    console.log('Kie node has data.output?', !!kieNode.data?.output);
  }
}

// Find the Get image from kie node results
const runData = execution.data?.resultData?.runData;
if (!runData) {
  console.log('No runData found, checking execution.data.nodes instead');
  // Check if data is in a different location
  const altData = execution.data?.nodes?.['Get image from kie']?.data?.output;
  if (altData) {
    console.log('Found data in nodes.data.output');
    const items = altData[0] || [];
    console.log('Total items:', items.length);
    items.forEach((item, idx) => {
      const state = item.json?.data?.state;
      console.log(`Item ${idx}: state=${state}`);
      if (state !== 'success') {
        console.log('  Full data:', JSON.stringify(item.json?.data, null, 2));
      }
    });
  }
  process.exit(0);
}

const kieNode = runData['Get image from kie'];
if (!kieNode) {
  console.log('No "Get image from kie" node found');
  console.log('Available nodes:', Object.keys(runData));
  process.exit(1);
}

const items = kieNode[0]?.data?.main?.[0] || [];
console.log('Total Kie items:', items.length);

items.forEach((item, idx) => {
  const state = item.json?.data?.state;
  const failMsg = item.json?.data?.failMsg;
  const failCode = item.json?.data?.failCode;
  if (state !== 'success') {
    console.log(`Item ${idx}: state=${state}, failMsg=${failMsg}, failCode=${failCode}`);
    console.log('Full data:', JSON.stringify(item.json?.data, null, 2));
  } else {
    console.log(`Item ${idx}: state=${state}`);
  }
});
