Add-Type -AssemblyName System.Drawing
$icoPath = (Get-Item "public\rgmcet_logo.ico").FullName
$pngPath = (Get-Item "public").FullName + "\rgmcet_logo.png"

$icon = [System.Drawing.Icon]::ExtractAssociatedIcon($icoPath)
$bmp = $icon.ToBitmap()
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Converted rgmcet_logo.ico to $pngPath"
