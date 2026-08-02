# build.ps1 — RP-Hub Desktop 一键打包脚本（Windows / PowerShell 5+）
#
# 用途:
#   在受限网络（无法访问 GitHub Releases）且未开启开发者模式 / 无管理员权限的
#   Windows 上，一条命令跑完 NSIS + Portable 两种产物。
#
# 用法:
#   powershell -ExecutionPolicy Bypass -File desktop\scripts\build.ps1
#   或（当前 PowerShell 会话内直接运行）
#   .\desktop\scripts\build.ps1
#
# 可选环境变量:
#   USE_SYSTEM_7ZA=1     使用 7za 包装器目录（默认 %TEMP%\rphub-7za-wrapper），
#                        解决 electron-builder 抽取 winCodeSign 的 symlink 失败问题。
#   RPHUB_7ZA_DIR=<path> 覆盖 7za 包装器目录（默认见上）。
#
# 幂等性: 重复运行安全——仅覆盖环境变量与 PATH，再重新执行 electron-builder。

$ErrorActionPreference = 'Stop'

Write-Host '==> [build] 设置 Electron / electron-builder 下载镜像（受限网络必需）' -ForegroundColor Cyan

# electron 二进制下载源。npm install 阶段会把 Electron 解压到 node_modules/electron/dist，
# 受限网络下 GitHub Releases 不可达，必须走镜像。
$env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
Write-Host "    ELECTRON_MIRROR  = $env:ELECTRON_MIRROR"

# electron-builder 运行期二进制（winCodeSign、nsis 等）下载源，同理走镜像。
$env:ELECTRON_BUILDER_BINARIES_MIRROR = 'https://npmmirror.com/mirrors/electron-builder-binaries/'
Write-Host "    ELECTRON_BUILDER_BINARIES_MIRROR = $env:ELECTRON_BUILDER_BINARIES_MIRROR"

# 7za 包装器（可选）。
# 背景: winCodeSign 压缩包内含 macOS symlink，electron-builder 用 app-builder-bin 自带的
# 7za 抽取时，在未开启开发者模式 / 无管理员权限的 Windows 上会因 symlink 支持不足而失败
# （7za 收到 -snld 参数、退出码 2）。解法是准备一个真实的 7za.exe 包装器（剥掉 -snld、
# 把退出码 2 映射为 0），并把其所在目录放到 PATH 最前，让 electron-builder 优先使用。
# 注意: Node 的 execFile 无法按 PATHEXT 解析 .cmd/.bat，包装器必须是真正的 .exe。
if ($env:USE_SYSTEM_7ZA) {
    $wrapperDir = if ($env:RPHUB_7ZA_DIR) {
        $env:RPHUB_7ZA_DIR
    } else {
        Join-Path $env:TEMP 'rphub-7za-wrapper'
    }
    $wrapperExe = Join-Path $wrapperDir '7za.exe'

    if (Test-Path -LiteralPath $wrapperExe) {
        if ($env:PATH -notlike "$wrapperDir*") {
            $env:PATH = $wrapperDir + ';' + $env:PATH
        }
        Write-Host "    [7za] 包装器目录已置入 PATH 最前: $wrapperDir" -ForegroundColor Yellow
    } else {
        Write-Warning "USE_SYSTEM_7ZA=1 但未找到 7za.exe（$wrapperExe）。请按 README 的『7za / winCodeSign symlink 问题』一节准备包装器后重试。"
    }
} else {
    Write-Host '    （未设置 USE_SYSTEM_7ZA。若打包时 7za 解压 winCodeSign 失败，'
    Write-Host '     请开启开发者模式，或设置 USE_SYSTEM_7ZA=1 并准备包装器后重跑。）' -ForegroundColor DarkGray
}

Push-Location (Join-Path $PSScriptRoot '..')
try {
    Write-Host ''
    Write-Host '==> [build] 1/2 NSIS 安装包' -ForegroundColor Cyan
    npm run dist:nsis
    if ($LASTEXITCODE -ne 0) { throw "npm run dist:nsis 失败（exit code $LASTEXITCODE）" }

    Write-Host ''
    Write-Host '==> [build] 2/2 Portable 便携版' -ForegroundColor Cyan
    npm run dist:portable
    if ($LASTEXITCODE -ne 0) { throw "npm run dist:portable 失败（exit code $LASTEXITCODE）" }

    Write-Host ''
    Write-Host '==> [build] 完成。产物位于 desktop\release\' -ForegroundColor Green
}
catch {
    Write-Host ''
    Write-Host '==> [build] 打包失败' -ForegroundColor Red
    Write-Host "    错误: $($_.Exception.Message)"
    Write-Host ''
    Write-Host '    下一步排查：' -ForegroundColor Yellow
    Write-Host '    1) 下载超时/失败 → 镜像变量本脚本已默认设置，确认网络能访问 npmmirror.com。'
    Write-Host '    2) 7za 解压 winCodeSign 报 -snld / symlink / exit code 2 → 开启开发者模式，或用 7za 包装器重跑：'
    Write-Host "       `$env:USE_SYSTEM_7ZA = 1"
    Write-Host "       & '$($PSCommandPath)'"
    Write-Host '    3) 杀毒软件拦截 electron-builder → 把 desktop\release 加入排除项后重试。'
    exit 1
}
finally {
    Pop-Location
}
