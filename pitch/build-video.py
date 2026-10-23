#!/usr/bin/env python3
"""Create a reproducible *clearly narrated* 2-minute pitch from original slides.
No stock images, external AI voices, paid accounts or mainnet transactions.
"""
from pathlib import Path
import json
import subprocess

ROOT=Path(__file__).resolve().parent
TMP=ROOT/"segments"
TMP.mkdir(exist_ok=True)
def duration(file):
    p=subprocess.run(["ffprobe","-v","error","-show_entries","format=duration",
      "-of","default=nokey=1:noprint_wrappers=1",str(file)],check=True,text=True,capture_output=True)
    return float(p.stdout.strip())
raw=[duration(ROOT/"voice"/f"voice-{i:02d}.wav") for i in range(1,8)]
TARGET=119.5
PAUSE=1.6
RATE=sum(raw)/(TARGET-7*PAUSE)
print(f"Raw total: {sum(raw):.3f}s, narration speed factor: {RATE:.5f}, target {TARGET}s",flush=True)
manifest=TMP/"manifest.txt"
details=[]
for i,raw_sec in enumerate(raw,1):
    slide=ROOT/"frames"/f"slide-{i:02d}.png"
    voice=ROOT/"voice"/f"voice-{i:02d}.wav"
    output=TMP/f"segment-{i:02d}.mp4"
    seg_duration=raw_sec/RATE+PAUSE
    cmd=["ffmpeg","-y","-nostdin","-loglevel","error","-loop","1","-framerate","5",
         "-i",str(slide),"-i",str(voice),"-filter_complex",
         f"[1:a]atempo={RATE:.7f},apad=pad_dur={PAUSE}[out]",
         "-map","0:v","-map","[out]","-t",f"{seg_duration:.3f}",
         "-c:v","libx264","-preset","ultrafast","-tune","stillimage","-pix_fmt","yuv420p",
         "-r","24","-crf","20","-threads","2",
         "-c:a","aac","-b:a","96k","-ac","1","-ar","44100",
         "-movflags","+faststart",str(output)]
    subprocess.run(cmd,check=True,timeout=35)
    true=duration(output)
    print(f"Slide {i}: {true:.3f}s",flush=True)
    details.append({"slide":i,"segmentDuration":true,"narrationText":(ROOT/"voice"/f"script-{i:02d}.txt").read_text().strip()})
with manifest.open("w") as f:
    for i in range(1,8): f.write(f"file '{TMP/f'segment-{i:02d}.mp4'}'\n")
final=ROOT/"MUSD-Signal-Glass-2min-Pitch-20261023.mp4"
subprocess.run(["ffmpeg","-y","-nostdin","-loglevel","error","-f","concat","-safe","0",
                "-i",str(manifest),"-c","copy","-movflags","+faststart",str(final)],check=True,timeout=35)
actual=duration(final)
receipt={"realOriginalDemoSource":"https://livastic-vm5-primary-20260911.github.io/mezo-musd-signal-glass/",
    "sourceRepo":"https://github.com/livastic-vm5-primary-20260911/mezo-musd-signal-glass",
    "output":final.name,"videoDurationSeconds":round(actual,3),"targetDurationSeconds":TARGET,
    "videoContainsOnlyOwnOriginalScreensAndGraphics":True,"voiceMethod":"locally synthesized English narration from transparently original script",
    "syntheticEvidencePresentedAsRealPayments":False,"mainnetTransactionsExecuted":0,"grantAwardClaimed":False,
    "segments":details}
(ROOT/"pitch-video-metadata.json").write_text(json.dumps(receipt,indent=2)+"\n")
print("COMPLETE",final,"duration",actual,"bytes",final.stat().st_size,flush=True)
if actual<108 or actual>135:raise RuntimeError("Outside approximate 2 minute pitch requirement")
