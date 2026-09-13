import subprocess,json,csv,io
from pathlib import Path
root=Path(__file__).resolve().parent;tshark='C:/Program Files/Wireshark/tshark.exe'
fields=['frame.number','frame.time_relative','eth.src','eth.dst','arp.opcode','arp.src.proto_ipv4','arp.dst.proto_ipv4','ip.src','ip.dst','ip.ttl','icmp.type','icmp.ident','icmp.seq']
def load(p):
 args=[tshark,'-r',str(p),'-Y','arp or icmp','-T','fields','-E','header=y','-E','separator=,','-E','quote=d']
 for f in fields:args+=['-e',f]
 r=subprocess.run(args,capture_output=True,text=True,check=True,encoding='utf-8');p.with_suffix('.csv').write_text(r.stdout,encoding='utf-8');return list(csv.DictReader(io.StringIO(r.stdout)))
def request(rows,ip):return [r for r in rows if r['arp.opcode']=='1' and r['arp.src.proto_ipv4']=='192.168.10.10' and r['arp.dst.proto_ipv4']==ip]
def echoes(rows):return [r for r in rows if r['icmp.type']=='8' and r['ip.src']=='192.168.10.10' and r['ip.dst']=='192.168.20.10']
allrows={};summary={}
for d in sorted(root.iterdir()):
 if not d.is_dir() or not d.name[:2].isdigit() or not 1 <= int(d.name[:2]) <= 9:continue
 pcaps=list(d.glob('*.pcap'))
 if not pcaps:continue
 allrows[d.name]={p.stem:load(p) for p in pcaps}
 rows=allrows[d.name]['pc1-sw1'];summary[d.name]={'arp_requests':sum(r['arp.opcode']=='1' for r in rows),'arp_replies':sum(r['arp.opcode']=='2' for r in rows),'icmp_requests':sum(r['icmp.type']=='8' for r in rows),'icmp_replies':sum(r['icmp.type']=='0' for r in rows)}
a=allrows['01-same-subnet']['pc1-sw1'];assert request(a,'192.168.10.20')
a=allrows['02-routed']['pc1-sw1'];b=allrows['02-routed']['r1-sw2'];assert request(a,'192.168.10.1');assert not request(a,'192.168.20.10')
left=echoes(a);right=echoes(b);assert len(left)==len(right)==3
transit=[]
for x,y in zip(left,right):
 assert (x['icmp.ident'],x['icmp.seq'])==(y['icmp.ident'],y['icmp.seq'])
 assert x['eth.dst']=='02:42:d4:39:68:00' and y['eth.src']=='02:42:d4:39:68:01'
 assert x['eth.src']!=y['eth.src'] and x['eth.dst']!=y['eth.dst']
 assert int(x['ip.ttl'])-1==int(y['ip.ttl'])
 transit.append({'ip_src':x['ip.src'],'ip_dst':x['ip.dst'],'before_mac_src':x['eth.src'],'before_mac_dst':x['eth.dst'],'after_mac_src':y['eth.src'],'after_mac_dst':y['eth.dst'],'ttl_before':x['ip.ttl'],'ttl_after':y['ip.ttl'],'icmp_seq':x['icmp.seq']})
for name,target in [('03-wrong-gateway','192.168.10.254'),('05-wrong-mask','192.168.20.10'),('07-gateway-down','192.168.10.1')]:
 a=allrows[name]['pc1-sw1'];assert request(a,target),name
 assert not any(r['arp.opcode']=='2' and r['arp.src.proto_ipv4']==target for r in a),name
 assert not echoes(allrows[name]['r1-sw2']),name
for name in ['04-gateway-recovered','06-mask-recovered','08-interface-recovered','09-restart-persistence']:
 a=allrows[name]['pc1-sw1'];assert len(echoes(a))==3,name
 assert sum(r['icmp.type']=='0' and r['ip.src']=='192.168.20.10' for r in a)==3,name
(root/'packet-validation.json').write_text(json.dumps({'passed':True,'counts':summary,'routed_packets':transit},indent=2),encoding='utf-8');print('Packet assertions passed for all nine scenarios')
