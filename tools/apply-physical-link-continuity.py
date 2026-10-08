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
"window.removeEventListener('pageshow',schedule);":"window.removeEventListener('pageshow',schedule);window.removeEventListener('resize',schedule);"
}.items():
 assert s.count(old)==1,old
 s=s.replace(old,new)
p.write_text(s)
print('Simulator HTML and scoped line renderer patched; shared guide/model/lessons/controller untouched.')
