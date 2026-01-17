$content = Get-Content 'C:\Users\shawh\.claude\projects\C--Users-shawh-OneDrive-Desktop-EdgeAi-YouTube-Narration-Video\67123841-9289-4619-8e25-45a1f0ae3ae1\tool-results\mcp-n8n-mcp-n8n_executions-1768568889246.txt' -Raw
if ($content -match '"sectionImageMapping":\s*(\[[\s\S]*?\])') {
    Write-Host "Found sectionImageMapping:"
    $match = $Matches[1]
    Write-Host $match.Substring(0, [Math]::Min(3000, $match.Length))
}
