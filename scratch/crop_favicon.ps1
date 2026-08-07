Add-Type -AssemblyName System.Drawing
$pngPath = (Get-Item "public\yugaspark_logo.png").FullName
$icoPath = (Get-Item "public").FullName + "\favicon.ico"
$pngOutPath = (Get-Item "public").FullName + "\favicon.png"

$origBmp = [System.Drawing.Bitmap]::FromFile($pngPath)

# Find bounding box of non-transparent pixels
$minX = $origBmp.Width
$minY = $origBmp.Height
$maxX = 0
$maxY = 0

for ($x = 0; $x -lt $origBmp.Width; $x += 4) {
    for ($y = 0; $y -lt $origBmp.Height; $y += 4) {
        $pixel = $origBmp.GetPixel($x, $y)
        if ($pixel.A -gt 30) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

$cropWidth = [Math]::Max(1, $maxX - $minX)
$cropHeight = [Math]::Max(1, $maxY - $minY)
$cropRect = New-Object System.Drawing.Rectangle $minX, $minY, $cropWidth, $cropHeight

Write-Host "Cropping emblem box: $minX, $minY, $cropWidth x $cropHeight from $($origBmp.Width)x$($origBmp.Height)"

# Create tight square cropped bitmap
$croppedBmp = $origBmp.Clone($cropRect, $origBmp.PixelFormat)

# Create 64x64 favicon
$favBmp = New-Object System.Drawing.Bitmap 64, 64
$g = [System.Drawing.Graphics]::FromImage($favBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$g.DrawImage($croppedBmp, 0, 0, 64, 64)
$g.Dispose()

# Save tight favicon PNG & ICO
$favBmp.Save($pngOutPath, [System.Drawing.Imaging.ImageFormat]::Png)

$hIcon = $favBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$stream = New-Object System.IO.FileStream $icoPath, ([System.IO.FileMode]::Create)
$icon.Save($stream)
$stream.Close()

$favBmp.Dispose()
$croppedBmp.Dispose()
$origBmp.Dispose()

Write-Host "Cropped & Generated sharp full-bleed favicon at $pngOutPath and $icoPath"
