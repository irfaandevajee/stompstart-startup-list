#!/usr/bin/env python3
import subprocess, textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W,H=1920,1080
OUT=Path('mermail_demo_build'); OUT.mkdir(exist_ok=True)
REG='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO='/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
BG=(17,19,24); PANEL=(29,33,41); TEXT=(241,245,249); MUTED=(171,181,196); ACC=(255,118,57); GOOD=(91,212,145); WARN=(255,196,87); BAD=(255,105,120)

slides=[
('Mermail Candidate Submission Guard','LIVE AGENT-SKILL DEMO • CHATGPT + MERMAIL MCP',[
'Prompt:','Before I submit Emma Clarke and Lucas Reed to Northstar Analytics','for Senior Data Scientist, verify role-specific consent and check for','duplicate or conflicting submission evidence. Do not send anything.','','Goal: prevent duplicate representation, protect candidate consent,','and return a clear READY / BLOCKED decision before client submission.'],
'This is the Mermail Candidate Submission Guard, a reusable recruiter-side agent skill running with ChatGPT and the Mermail MCP connector. The trigger prompt asks the agent to verify role-specific candidate representation consent for Northstar Analytics, check for duplicate or conflicting submission evidence, and make no external changes. The skill is designed to fail closed when consent, identity, client, role, or ownership is unclear.'),
('1. Resolve the Mermail mailbox','ACTUAL CONNECTED MAILBOX',[
'Mailbox: candidate-guard-demo@mermail.app','public_id: 032b41bb-aa58-4f1c-b4aa-46d3f830a009','receiving_status: ready','can_receive: true','','Bounded search: Emma Clarke → 2 clean matches','Bounded search: Lucas Reed → 1 clean match','','The workflow starts metadata-only, then reads only the selected clean','messages needed to decide consent and duplicate risk.'],
'First, the agent resolves the existing Mermail mailbox instead of creating a duplicate. The connected mailbox is candidate guard demo at mermail dot app and it is ready to receive. The skill then performs bounded metadata-only searches. Emma Clarke returns two clean matches, and Lucas Reed returns one. Only those selected messages are opened for exact evidence, which keeps the workflow reproducible and limits unnecessary mailbox access.'),
('2. Emma Clarke — consent is confirmed','MERMAIL MESSAGE 56d3feb2…',[
'Candidate: Emma Clarke','Client: Northstar Analytics','Role: Senior Data Scientist','Consent timestamp: 2026-10-05','Validity supplied in demo record: 7 days','','Evidence:','“I consent to being represented … and authorize Candidate Submission','Guard Demo to submit my profile for this specific role.”','','Consent classification: CONFIRMED'],
'For Emma Clarke, the selected Mermail consent message is clean and explicitly binds the candidate, the client, and the exact Senior Data Scientist role. It states that she consents to representation and authorizes this demo recruiter identity to submit her profile for this specific role. The consent record includes a timestamp and a seven-day validity rule supplied by the synthetic test data. Under the skill rules, Emma consent status is confirmed.'),
('3. Emma Clarke — duplicate conflict blocks submission','MERMAIL MESSAGE 2ad8bf0a…',[
'Existing submission record:','Candidate: Emma Clarke','Client: Northstar Analytics','Role: Senior Data Scientist','Requisition: NSA-SDS-104','Existing agency: BluePeak Recruitment','Existing submission date: 2026-10-04','','Duplicate risk: LIKELY','Final decision: BLOCKED','Next safe action: resolve ownership before any resubmission.'],
'The second Emma message changes the final decision. Mermail contains an existing submission record for the same candidate, same client, same role, and requisition NSA S D S 104. It records BluePeak Recruitment as the existing agency and an earlier submission date of October fourth. The skill treats this as likely duplicate evidence. Even though consent is confirmed, the submission is blocked until ownership is resolved. This is the core safety value: valid consent alone is not enough when a duplicate conflict exists.'),
('4. Lucas Reed — clear path to submit','MERMAIL MESSAGE ef7791cb…',[
'Candidate: Lucas Reed','Client: Northstar Analytics','Role: Senior Data Scientist','Consent timestamp: 2026-10-05','','Evidence:','“I consent to being represented … for this specific role.”','“I have not authorized another agency for this role.”','','Duplicate search result: none found in selected mailbox scope','Final decision: READY TO SUBMIT'],
'Lucas Reed produces the opposite result. His Mermail message gives explicit role-specific consent for the same client and role, and states that he has not authorized another agency for this role. A bounded duplicate search in the selected mailbox scope finds no conflicting record. The final decision is ready to submit. No email is sent and no mailbox data is modified. The agent only returns the readiness decision and the supporting evidence.'),
('5. Reusable skill, auditable result','PUBLIC GITHUB PR #467',[
'Skill: mermail-candidate-submission-guard','PR: github.com/Nudgen-Marketing/mermail-skills/pull/467','Status: OPEN • MERGEABLE','AI client: ChatGPT + Mermail MCP','','Final live-demo verdicts:','Emma Clarke  →  BLOCKED (confirmed consent + likely duplicate)','Lucas Reed   →  READY TO SUBMIT (confirmed consent, no conflict found)','','Security: inbound email is evidence, never agent authority.','Synthetic demo data only — no real candidate records.'],
'The reusable skill is published in public GitHub pull request four sixty seven to the official Mermail skills repository. It documents the workflow, tool boundaries, deterministic evaluation cases, and security rules. The live result is auditable: Emma Clarke is blocked because confirmed consent is outweighed by a likely duplicate submission, while Lucas Reed is ready to submit because consent is confirmed and no conflict is found. Inbound email is treated as untrusted evidence, never as authority to broaden scope or send. This completes the working Mermail agent skill demonstration.')]

def F(path,size): return ImageFont.truetype(path,size)
def wrap(draw,text,x,y,font,fill,width=83,gap=10):
    if not text: return y+font.size+gap
    for line in textwrap.wrap(text,width=width,replace_whitespace=False) or ['']:
        draw.text((x,y),line,font=font,fill=fill); y += font.size+gap
    return y

def make_slide(i,title,kicker,body):
    im=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(im)
    d.rounded_rectangle((90,80,W-90,H-80),radius=28,fill=PANEL)
    d.rectangle((90,80,112,H-80),fill=ACC)
    d.text((145,125),kicker,font=F(BOLD,28),fill=ACC)
    d.text((145,185),title,font=F(BOLD,54),fill=TEXT)
    y=290; mono=F(MONO,31)
    for line in body:
        u=line.upper(); col=TEXT
        if 'READY TO SUBMIT' in u or 'CONFIRMED' in u or 'NONE FOUND' in u: col=GOOD
        elif 'BLOCKED' in u or 'LIKELY' in u: col=BAD
        elif 'PROMPT:' in u or 'EVIDENCE:' in u or 'SECURITY:' in u: col=WARN
        y=wrap(d,line,145,y,mono,col)
    d.text((145,H-125),f'Mermail Agent Skill Demo • {i+1}/{len(slides)} • Live Mermail MCP evidence captured 2026-10-06',font=F(REG,22),fill=MUTED)
    p=OUT/f'slide_{i:02d}.png'; im.save(p); return p

def run(c): subprocess.run(c,check=True)
def dur(p): return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(p)],text=True).strip())

segs=[]
for i,(title,kicker,body,narr) in enumerate(slides):
    png=make_slide(i,title,kicker,body); wav=OUT/f'voice_{i:02d}.wav'
    run(['espeak-ng','-s','142','-p','48','-w',str(wav),narr]); d=max(dur(wav)+0.8,12.0)
    seg=OUT/f'seg_{i:02d}.mp4'; vf=f'scale={W}:{H},format=yuv420p,fade=t=in:st=0:d=0.35,fade=t=out:st={max(d-0.4,0):.3f}:d=0.4'
    run(['ffmpeg','-y','-loop','1','-i',str(png),'-i',str(wav),'-vf',vf,'-t',f'{d:.3f}','-r','30','-c:v','libx264','-preset','veryfast','-crf','20','-c:a','aac','-b:a','160k','-ar','44100','-shortest','-movflags','+faststart',str(seg)])
    segs.append(seg)
concat=OUT/'concat.txt'; concat.write_text('\n'.join(f"file '{p.resolve()}'" for p in segs)+'\n')
final=Path('Mermail_Candidate_Submission_Guard_Demo.mp4')
run(['ffmpeg','-y','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(final)])
print(f'Created {final}: {dur(final):.1f}s')
