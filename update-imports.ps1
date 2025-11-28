# Script tự động cập nhật imports sau khi tái cấu trúc
# Chạy: .\update-imports.ps1

Write-Host "🔄 Đang cập nhật imports..." -ForegroundColor Cyan

# 1. Cập nhật imports types → core/models
Write-Host "📝 Cập nhật imports types → core/models..." -ForegroundColor Yellow
Get-ChildItem -Path "src/app/features" -Recurse -Filter "*.ts" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $original = $content
    
    # Cập nhật relative paths
    $content = $content -replace "from ['\`"]\.\./types/", "from '../../../core/models/"
    $content = $content -replace "from ['\`"]\.\./\.\./types/", "from '../../../../core/models/"
    $content = $content -replace "from ['\`"]\.\./\.\./\.\./types/", "from '../../../../../core/models/"
    $content = $content -replace "from ['\`"]\.\./\.\./\.\./\.\./types/", "from '../../../../../../core/models/"
    
    if ($content -ne $original) {
        Set-Content -Path $_.FullName -Value $content -NoNewline
        Write-Host "  ✓ Updated: $($_.Name)" -ForegroundColor Green
    }
}

# 2. Cập nhật imports service → core/services
Write-Host "📝 Cập nhật imports service → core/services..." -ForegroundColor Yellow
Get-ChildItem -Path "src/app/features" -Recurse -Filter "*.ts" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $original = $content
    
    $content = $content -replace "from ['\`"]\.\./service/", "from '../../../core/services/"
    $content = $content -replace "from ['\`"]\.\./\.\./service/", "from '../../../../core/services/"
    $content = $content -replace "from ['\`"]\.\./\.\./\.\./service/", "from '../../../../../core/services/"
    $content = $content -replace "from ['\`"]\.\./\.\./\.\./\.\./service/", "from '../../../../../../core/services/"
    
    if ($content -ne $original) {
        Set-Content -Path $_.FullName -Value $content -NoNewline
        Write-Host "  ✓ Updated: $($_.Name)" -ForegroundColor Green
    }
}

# 3. Cập nhật imports config → core/config
Write-Host "📝 Cập nhật imports config → core/config..." -ForegroundColor Yellow
Get-ChildItem -Path "src/app" -Recurse -Filter "*.ts" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $original = $content
    
    $content = $content -replace "from ['\`"]\.\./config/firebase", "from '../../core/config/firebase"
    $content = $content -replace "from ['\`"]\.\./\.\./config/firebase", "from '../../../core/config/firebase"
    $content = $content -replace "from ['\`"]\.\./\.\./\.\./config/firebase", "from '../../../../core/config/firebase"
    $content = $content -replace "from ['\`"]\.\./\.\./\.\./\.\./config/firebase", "from '../../../../../core/config/firebase"
    
    if ($content -ne $original) {
        Set-Content -Path $_.FullName -Value $content -NoNewline
        Write-Host "  ✓ Updated: $($_.Name)" -ForegroundColor Green
    }
}

# 4. Cập nhật imports header/footer components
Write-Host "📝 Cập nhật imports header/footer..." -ForegroundColor Yellow
Get-ChildItem -Path "src/app" -Recurse -Filter "*.ts" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $original = $content
    
    $content = $content -replace "from ['\`"]\.\./header/header-navbar", "from '../../shared/components/header/header-navbar"
    $content = $content -replace "from ['\`"]\.\./\.\./header/header-navbar", "from '../../../shared/components/header/header-navbar"
    $content = $content -replace "from ['\`"]\.\./footer-page", "from '../../shared/components/footer"
    $content = $content -replace "from ['\`"]\.\./\.\./footer-page", "from '../../../shared/components/footer"
    
    if ($content -ne $original) {
        Set-Content -Path $_.FullName -Value $content -NoNewline
        Write-Host "  ✓ Updated: $($_.Name)" -ForegroundColor Green
    }
}

# 5. Cập nhật imports body components
Write-Host "📝 Cập nhật imports body components..." -ForegroundColor Yellow
Get-ChildItem -Path "src/app" -Recurse -Filter "*.ts" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $original = $content
    
    $content = $content -replace "from ['\`"]\.\./body/body-page", "from '../../home/home-page"
    $content = $content -replace "from ['\`"]\.\./\.\./body/body-page", "from '../../../home/home-page"
    
    if ($content -ne $original) {
        Set-Content -Path $_.FullName -Value $content -NoNewline
        Write-Host "  ✓ Updated: $($_.Name)" -ForegroundColor Green
    }
}

Write-Host "✅ Hoàn tất cập nhật imports!" -ForegroundColor Green
Write-Host "⚠️  Lưu ý: Một số imports có thể cần điều chỉnh thủ công" -ForegroundColor Yellow

