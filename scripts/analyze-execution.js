const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const execution = JSON.parse(data[0].text);

const nodes = execution.data?.nodes;
if (!nodes) {
  console.log('No nodes found');
  process.exit(1);
}

console.log('=== EXECUTION 8798 ANALYSIS ===\n');

// Find the json2video payload nodes
const prepareBodyNode = nodes['prepare body for jsontovideo to set video'];
if (prepareBodyNode?.data?.output?.[0]?.[0]) {
  const payload = prepareBodyNode.data.output[0][0].json;
  console.log('=== MAIN VIDEO PAYLOAD (prepare body for jsontovideo) ===');

  // Extract audio elements
  if (payload.scenes?.[0]?.elements) {
    const audioElements = payload.scenes[0].elements.filter(e => e.type === 'audio');
    console.log('\nAudio elements count:', audioElements.length);
    audioElements.forEach((audio, idx) => {
      console.log(`\nAudio ${idx}:`);
      console.log('  start:', audio.start);
      console.log('  duration:', audio.duration);
      console.log('  src:', audio.src?.substring(0, 80) + '...');
      if (audio.speed) console.log('  speed:', audio.speed);
    });
  }

  // Check for subtitles
  const subtitles = payload.scenes?.[0]?.elements?.find(e => e.type === 'subtitles');
  if (subtitles) {
    console.log('\n=== SUBTITLES ELEMENT ===');
    console.log(JSON.stringify(subtitles, null, 2));
  }
}

// Find the final edit node
const editNode = nodes['json2video - Edit video1'];
if (editNode?.data?.output?.[0]?.[0]) {
  console.log('\n=== FINAL EDIT PAYLOAD (json2video - Edit video1) ===');
  const editPayload = editNode.data.output[0][0].json;
  console.log('Full payload:', JSON.stringify(editPayload, null, 2));
} else {
  console.log('\n=== FINAL EDIT NODE - Checking input ===');
  if (editNode?.data?.input) {
    console.log('Input data:', JSON.stringify(editNode.data.input, null, 2).substring(0, 2000));
  }
}

// Check the Format variables node for video_duration
const formatNode = nodes['Format variables for final editing1'];
if (formatNode?.data?.output?.[0]?.[0]) {
  console.log('\n=== FORMAT VARIABLES ===');
  const formatData = formatNode.data.output[0][0].json;
  console.log('video_duration:', formatData.video_duration);
  console.log('video url:', formatData.video?.substring(0, 80) + '...');
}

// Check the main video merge node
const mergeNode = nodes['Make body for jsontovideo Api to merge videos clips'];
if (mergeNode?.data?.output?.[0]?.[0]) {
  console.log('\n=== VIDEO MERGE PAYLOAD ===');
  const mergePayload = mergeNode.data.output[0][0].json;
  console.log('Total scenes:', mergePayload.scenes?.length);
  if (mergePayload.scenes) {
    mergePayload.scenes.forEach((scene, idx) => {
      console.log(`Scene ${idx}: duration=${scene.duration}, elements=${scene.elements?.length}`);
    });
  }
}
