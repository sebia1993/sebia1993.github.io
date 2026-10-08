from pathlib import Path
import hashlib
root=Path(__file__).resolve().parents[1]
p=root/'labs/physical-network-simulator.html'
b=p.read_bytes();assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()=='89a224b6c49229dfb5f0bccc2226669be7f60049'
s=b.decode()
changes={
'<script type="module" src="physical-network-topology.js?v=20261007-2"></script>':'<script type="module" src="physical-network-simulator-links.js?v=20261008-continuity"></script>',
'<link rel="stylesheet" href="physical-network-simulator.css?v=20261008-material-review">':'<link rel="stylesheet" href="physical-network-simulator.css?v=20261008-material-review"><link rel="stylesheet" href="physical-network-simulator-links.css?v=20261008-continuity">'
}
for old,new in changes.items():
 assert s.count(old)==1,old
 s=s.replace(old,new)
p.write_text(s)
p=root/'labs/physical-network-simulator-links.js';s=p.read_text()
for old,new in {
"attributeFilter:['class']":"attributeFilter:['class','style']",
"window.addEventListener('pageshow',schedule);":"window.addEventListener('pageshow',schedule);window.addEventListener('resize',schedule);",
"window.removeEventListener('pageshow',schedule);":"window.removeEventListener('pageshow',schedule);window.removeEventListener('resize',schedule);",
"const iconTop=local(0,parts[s.to].querySelector('svg').getBoundingClientRect().top).y;":"const entryTop=local(0,parts[s.to].getBoundingClientRect().top).y;",
"s.kind==='copper'?(b.y+iconTop)/2":"s.kind==='copper'?(b.y+entryTop)/2"
}.items():
 assert s.count(old)==1,old
 s=s.replace(old,new)
p.write_text(s)
p=root/'labs/physical-network-simulator-links.css';s=p.read_text()
for old,new in {
'--phy-axis:vertical;row-gap:16px':'--phy-axis:vertical;row-gap:3px',
'position:relative;padding-left:64px;width:100%;justify-self:stretch':'position:relative;padding:2px 10px 2px 64px;min-height:44px;width:100%;justify-self:stretch',
'padding-left:22px;border-bottom:2px':'padding-left:22px;min-height:52px;border-bottom:2px',
'width:100%;margin:0;padding:8px;justify-self:stretch;text-align:left':'width:100%;margin:0;padding:4px 8px;justify-self:stretch;text-align:left'
}.items():
 assert s.count(old)==1,old
 s=s.replace(old,new)
s+='\n@media(max-width:900px){#physicalLab :is(.phy-ap1,.phy-ap2)>:is(strong,small,.phy-status){margin-left:18px}}\n'
p.write_text(s)
print('Simulator-only continuous wiring, compact layout and text clearance updated.')
