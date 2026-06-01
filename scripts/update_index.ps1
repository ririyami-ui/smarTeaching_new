$indexPath = "F:\app-firebase\Smart Teaching\smart-teaching-manager\src\utils\data\books\index.json"
$sdDir = "F:\app-firebase\Smart Teaching\smart-teaching-manager\src\utils\data\books\sd"

# Read existing index
$existing = Get-Content $indexPath -Raw | ConvertFrom-Json

# Build SD entries
$sdEntries = @()

# Mapel mapping: folder prefix, display name
$mapels = @(
    @{prefix="matematika"; name="Matematika"; idPrefix="mat"},
    @{prefix="indo"; name="Bahasa Indonesia"; idPrefix="ind"},
    @{prefix="pkn"; name="Pendidikan Pancasila"; idPrefix="pkn"},
    @{prefix="ipas"; name="IPAS"; idPrefix="ipa"},
    @{prefix="pjok"; name="PJOK"; idPrefix="pjo"},
    @{prefix="seni"; name="Seni Rupa"; idPrefix="sen"},
    @{prefix="pai"; name="Pendidikan Agama Islam"; idPrefix="pai"}
)

$kelasRomawi = @{1="I";2="II";3="III";4="IV";5="V";6="VI"}

foreach ($mapel in $mapels) {
    foreach ($kelas in 1..6) {
        $entry = @{
            id = "sd-$($mapel.idPrefix)-$kelas"
            jenjang = "SD"
            mapel = $mapel.name
            kelas = [string]$kelas
            title = "$($mapel.name) Kelas $($kelasRomawi[$kelas]) (Kurikulum Merdeka)"
            path = "sd/$($mapel.prefix)_$kelas.json"
        }
        $sdEntries += $entry
    }
}

# Combine and write
# Build SMA entries
$smaEntries = @()

$smaMapels = @(
    @{prefix="matematika"; name="Matematika"; idPrefix="mtk"},
    @{prefix="indo"; name="Bahasa Indonesia"; idPrefix="ind"},
    @{prefix="inggris"; name="Bahasa Inggris"; idPrefix="ing"},
    @{prefix="pkn"; name="Pendidikan Pancasila"; idPrefix="pkn"},
    @{prefix="pjok"; name="PJOK"; idPrefix="pjo"},
    @{prefix="pai"; name="Pendidikan Agama Islam"; idPrefix="pai"},
    @{prefix="mtk_lanjut"; name="Matematika Tingkat Lanjut"; idPrefix="mtl"},
    @{prefix="fisika"; name="Fisika"; idPrefix="fis"},
    @{prefix="kimia"; name="Kimia"; idPrefix="kim"},
    @{prefix="biologi"; name="Biologi"; idPrefix="bio"},
    @{prefix="ekonomi"; name="Ekonomi"; idPrefix="eko"},
    @{prefix="geografi"; name="Geografi"; idPrefix="geo"},
    @{prefix="sosiologi"; name="Sosiologi"; idPrefix="sos"}
)

$smaKelasRomawi = @{10="X";11="XI";12="XII"}

foreach ($mapel in $smaMapels) {
    foreach ($kelas in 10..12) {
        $entry = @{
            id = "sma-$($mapel.idPrefix)-$kelas"
            jenjang = "SMA"
            mapel = $mapel.name
            kelas = [string]$kelas
            title = "$($mapel.name) Kelas $($smaKelasRomawi[$kelas]) (Kurikulum Merdeka)"
            path = "sma/$($mapel.prefix)_$kelas.json"
        }
        $smaEntries += $entry
    }
}

# Remove old SD/SMA entries then add new ones
$existing = $existing | Where-Object { $_.jenjang -ne "SD" -and $_.jenjang -ne "SMA" }

$all = $existing + $sdEntries + $smaEntries
$all | ConvertTo-Json -Depth 2 | Set-Content $indexPath -Encoding UTF8

Write-Host "Index updated! SD: $($sdEntries.Count), SMA: $($smaEntries.Count), Total: $($all.Count)"
