# Build script for Second Memory
Write-Host "🔨 Building Second Memory..." -ForegroundColor Cyan

# Build dashboard
Write-Host "`n📊 Building Dashboard..." -ForegroundColor Yellow
Set-Location dashboard
npm run build
Set-Location ..

# Build extension
Write-Host "`n🧩 Building Extension..." -ForegroundColor Yellow
Set-Location extension
npm run build
Set-Location ..

# Copy dashboard to extension
Write-Host "`n📦 Copying Dashboard to Extension..." -ForegroundColor Yellow
Copy-Item dashboard/dist/index.html extension/dist/dashboard.html -Force
Copy-Item dashboard/dist/index.js extension/dist/dashboard.js -Force
Copy-Item dashboard/dist/index.css extension/dist/dashboard.css -Force

# Fix dashboard.html paths
Write-Host "🔧 Fixing dashboard paths..." -ForegroundColor Yellow
$dashboardHtml = Get-Content extension/dist/dashboard.html -Raw
$dashboardHtml = $dashboardHtml -replace 'src="\.\/index\.js"', 'src="./dashboard.js"'
$dashboardHtml = $dashboardHtml -replace 'href="\.\/index\.css"', 'href="./dashboard.css"'
Set-Content extension/dist/dashboard.html -Value $dashboardHtml -NoNewline

Write-Host "`n✅ Build Complete!" -ForegroundColor Green
Write-Host "📂 Extension files are in: extension/dist/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Go to chrome://extensions/" -ForegroundColor White
Write-Host "2. Find 'Second Memory' and click the RELOAD button" -ForegroundColor White
Write-Host "3. Click the extension icon and open dashboard" -ForegroundColor White
Write-Host "4. You should now see your 10 saved memories!" -ForegroundColor Green

