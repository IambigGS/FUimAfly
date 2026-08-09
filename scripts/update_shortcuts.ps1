# Powershell Script to Generate and Update Project Windows Explorer Shortcuts

$projectRoot = Resolve-Path "$PSScriptRoot\.." | Select-Object -ExpandProperty Path
$shortcutsDir = Join-Path $projectRoot "_SHORTCUTS"

Write-Host "Generating Project Shortcuts at: $shortcutsDir" -ForegroundColor Cyan

# Define shortcut mappings: Subfolder -> Shortcut Name -> Target Directory Path
$shortcutMappings = @{
    "01_Cutscenes_Prompts_and_Flow" = @{
        "Google_Flow_Prompts_and_Scripts.lnk" = "Game_Intro"
        "Generated_Flow_Video_Clips.lnk"       = "_raw_assetts\Flow"
        "Runtime_Game_Videos.lnk"              = "public\assets\videos"
        "Film_Director_Recordings.lnk"         = "_raw_assetts\filmDirector-not-lol"
    }
    "02_Art_and_Concepts" = @{
        "Luna_Art_and_UI_Concepts.lnk"         = "_raw_assetts\luna_concepts"
        "Runtime_Game_Images.lnk"              = "public\assets"
        "XRay_Art_Contributions.lnk"           = "_raw_assetts\X-ray contribution"
    }
    "03_Game_Audio" = @{
        "Active_Fly_and_Ninja_Sounds.lnk"      = "public\sounds\flies"
        "Raw_Master_Audio_Recordings.lnk"      = "_raw_assetts\audio_stuff"
        "Echo_Audio_Concepts.lnk"              = "_raw_assetts\echo_concepts"
        "Archived_Legacy_Sounds.lnk"           = "_raw_assetts\archive\legacy_public_sounds"
    }
    "04_Source_Code_and_Engine" = @{
        "React_Components.lnk"                 = "src\components"
        "Audio_Engine_and_Utils.lnk"           = "src\utils"
        "Web_Public_Root.lnk"                  = "public"
    }
    "05_Builds_and_Mobile" = @{
        "Android_Capacitor_Project.lnk"        = "android"
        "Exported_APKs.lnk"                     = "APKs"
        "Web_Production_Build_Dist.lnk"       = "dist"
    }
    "06_Behind_The_Scenes" = @{
        "Behind_The_Scenes_BTS.lnk"            = "BTS"
    }
}

$wshShell = New-Object -ComObject WScript.Shell

foreach ($category in $shortcutMappings.Keys) {
    $categoryDir = Join-Path $shortcutsDir $category
    if (-not (Test-Path $categoryDir)) {
        New-Item -ItemType Directory -Path $categoryDir -Force | Out-Null
    }
    
    $links = $shortcutMappings[$category]
    foreach ($linkName in $links.Keys) {
        $relativePath = $links[$linkName]
        $targetPath = Join-Path $projectRoot $relativePath
        
        if (Test-Path $targetPath) {
            $shortcutPath = Join-Path $categoryDir $linkName
            $shortcut = $wshShell.CreateShortcut($shortcutPath)
            $shortcut.TargetPath = $targetPath
            $shortcut.Save()
            Write-Host " [OK] Created $category\$linkName -> $relativePath" -ForegroundColor Green
        } else {
            Write-Host " [SKIP] Target path does not exist: $targetPath" -ForegroundColor Yellow
        }
    }
}

Write-Host "`nAll project shortcuts updated successfully!" -ForegroundColor Cyan
