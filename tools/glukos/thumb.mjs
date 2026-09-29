// Miniatyr för sajten: ~600 px JPEG utan EXIF (ingen plats, ingen kamera,
// ingen tid i filen – tiden sparas separat i GlucoseDay.json). ffmpeg först
// (finns via winget), annars System.Drawing via PowerShell.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

let cachedFfmpeg;

export function findFfmpeg() {
  if (cachedFfmpeg !== undefined) return cachedFfmpeg;
  const candidates = [];
  if (process.env.FFMPEG) candidates.push(process.env.FFMPEG);
  const where = spawnSync("where.exe", ["ffmpeg"], { encoding: "utf8", windowsHide: true });
  if (where.status === 0) candidates.push(...where.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean));
  const pkgs = path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Packages");
  try {
    for (const d of fs.readdirSync(pkgs)) {
      if (!/^Gyan\.FFmpeg/.test(d)) continue;
      for (const sub of fs.readdirSync(path.join(pkgs, d))) {
        const exe = path.join(pkgs, d, sub, "bin", "ffmpeg.exe");
        if (fs.existsSync(exe)) candidates.push(exe);
      }
    }
  } catch { /* winget-mappen saknas */ }
  cachedFfmpeg = candidates.find((c) => fs.existsSync(c)) || null;
  return cachedFfmpeg;
}

function viaFfmpeg(ffmpeg, src, dest, maxPx) {
  const r = spawnSync(ffmpeg, [
    "-y", "-loglevel", "error", "-i", src,
    "-vf", `scale='min(${maxPx},iw)':-2`,
    "-map_metadata", "-1", "-q:v", "4", dest,
  ], { encoding: "utf8", windowsHide: true });
  if (r.status !== 0) throw new Error(`ffmpeg: ${(r.stderr || "").slice(0, 200)}`);
}

function viaPowerShell(src, dest, maxPx) {
  const ps = `
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('${src.replace(/'/g, "''")}')
$scale = [Math]::Min(1, ${maxPx} / [Math]::Max($img.Width, $img.Height))
$w = [int][Math]::Round($img.Width * $scale); $h = [int][Math]::Round($img.Height * $scale)
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, $w, $h)
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 82L
$bmp.Save('${dest.replace(/'/g, "''")}', $codec, $ep)
$g.Dispose(); $bmp.Dispose(); $img.Dispose()
`;
  const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { encoding: "utf8", windowsHide: true });
  if (r.status !== 0) throw new Error(`PowerShell-miniatyr: ${(r.stderr || "").slice(0, 200)}`);
}

/** Skapar dest (JPEG, max `maxPx` på längsta sidan, all metadata borttagen). */
export function makeThumbnail(src, dest, maxPx = 600) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const ffmpeg = findFfmpeg();
  if (ffmpeg) viaFfmpeg(ffmpeg, src, dest, maxPx);
  else viaPowerShell(src, dest, maxPx);
  if (!fs.existsSync(dest) || fs.statSync(dest).size === 0) throw new Error("Miniatyren blev tom");
  return dest;
}
