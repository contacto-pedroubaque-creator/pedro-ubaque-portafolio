# Sincroniza los archivos de producción hacia la carpeta dist/
$distPath = ".\dist"
if (-not (Test-Path $distPath)) {
    New-Item -ItemType Directory -Path $distPath -Force | Out-Null
}

$prodFiles = @(
    "index.html", "projects.html", "404.html", "robots.txt",
    "site.webmanifest", "_headers", "_redirects", "vercel.json",
    "style.css", "style.min.css", "projects.css", "projects.min.css",
    "enhancements.css", "enhancements.min.css",
    "script.js", "script.min.js", "projects.js",
    "enhancements.js", "enhancements.min.js"
)

foreach ($f in $prodFiles) {
    if (Test-Path $f) { Copy-Item -Path $f -Destination $distPath -Force }
}

$prodDirs = @("assets", "frames", "Fondo_projects")
foreach ($d in $prodDirs) {
    if (Test-Path $d) { Copy-Item -Path $d -Destination "$distPath\$d" -Recurse -Force }
}

Write-Host "Carpeta dist/ actualizada con éxito para despliegue."
