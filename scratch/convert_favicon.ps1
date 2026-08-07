Add-Type -AssemblyName System.Drawing
$pngPath = (Get-Item "public\yugaspark_logo.png").FullName
$icoPath = (Get-Item "public").FullName + "\favicon.ico"

$img = [System.Drawing.Image]::FromFile($pngPath)
$bmp = New-Object System.Drawing.Bitmap $img, 64, 64
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)

$stream = New-Object System.IO.FileStream $icoPath, ([System.IO.FileMode]::Create)
$icon.Save($stream)
$stream.Close()

$bmp.Dispose()
$img.Dispose()
Write-Host "Converted yugaspark_logo.png to $icoPath"
