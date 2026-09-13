"""Validate complete Ethernet PCAP records and correlate raw frames across links."""
import struct,json,hashlib,re
from pathlib import Path
ROOT=Path(__file__).resolve().parent
CAP=ROOT;RES=ROOT
MACS=['00:50:79:66:68:0'+str(i) for i in range(3)]
def mac(b):return ':'.join('%02x'%x for x in b)
def ipv4(b):return '.'.join(str(x) for x in b)
def parse(p):
 b=p.read_bytes();assert len(b)>=24,(p,'missing header')
 endian={'d4c3b2a1':'<','a1b2c3d4':'>','4d3cb2a1':'<','a1b23c4d':'>'}[b[:4].hex()]
 nano=b[:4].hex() in ['4d3cb2a1','a1b23c4d'];h=struct.unpack(endian+'IHHIIII',b[:24]);assert h[-1]==1,(p,'not Ethernet')
 offset=24;packets=[]
 while offset<len(b):
  assert len(b)-offset>=16,(p,'partial record header')
  sec,frac,n,orig=struct.unpack(endian+'IIII',b[offset:offset+16]);offset+=16
  assert n==orig and n>=14 and offset+n<=len(b),(p,'truncated frame')
  f=b[offset:offset+n];offset+=n
  d={'frame':len(packets)+1,'time':sec+frac/(1e9 if nano else 1e6),'length':n,'dst':mac(f[:6]),'src':mac(f[6:12]),'type':hex(int.from_bytes(f[12:14],'big')),'sha256':hashlib.sha256(f).hexdigest()}
  if d['type']=='0x806' and len(f)>=42:
   d.update(protocol='ARP',op=int.from_bytes(f[20:22],'big'),sender_ip=ipv4(f[28:32]),target_ip=ipv4(f[38:42]))
  if d['type']=='0x800' and len(f)>=34:
   ihl=(f[14]&15)*4;d.update(protocol='IPv4',src_ip=ipv4(f[26:30]),dst_ip=ipv4(f[30:34]))
   if f[23]==1 and len(f)>=14+ihl+8:
    k=14+ihl;d.update(protocol='ICMP',icmp_type=f[k],icmp_id=int.from_bytes(f[k+4:k+6],'big'),icmp_seq=int.from_bytes(f[k+6:k+8],'big'))
  packets.append(d)
 return {'file':p.name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'packets':packets}
def fdb(out):return {m.lower():int(p) for p,m in re.findall(r'^\s*(\d+)\s+([0-9a-f:]{17})\s+no\s+',out,re.M|re.I)}
def main():
 docs={p.parent.name+'-pc'+p.stem[2]+'.pcap':parse(p) for p in sorted(CAP.glob('*/pc[123]-sw1.pcap'))}
 obs=json.loads((RES/'observations.json').read_text())
 def table(label):return fdb(obs[label]['output'])
 def packets(test,pc):return docs[test+'-pc'+str(pc)+'.pcap']['packets']
 def echo(test,pc):return [p for p in packets(test,pc) if p.get('icmp_type')==8 and p['src']==MACS[0] and p['dst']==MACS[1]]
 def arps(test,pc,target):return [p for p in packets(test,pc) if p.get('op')==1 and p['src']==MACS[0] and p['dst']=='ff:ff:ff:ff:ff:ff' and p['target_ip']==target]
 def hashes(ps):return {p['sha256'] for p in ps}
 first='01-arp-first-contact';known='02-known-unicast';broadcast='03-broadcast';unknown='04-unknown-unicast';relearn='05-mac-relearning'
 first_arp=arps(first,1,'192.168.10.20');first_reply=[p for p in packets(first,1) if p.get('op')==2 and p['src']==MACS[1] and p['dst']==MACS[0]]
 tests={
 'Source MAC Learning':table('source-pc1-only').get(MACS[0])==1 and MACS[1] not in table('source-pc1-only') and table('source-both-learned').get(MACS[1])==2 and bool(first_arp) and bool(first_reply) and first_arp[0]['time']<first_reply[0]['time'],
 'ARP Broadcast Flooding':bool(arps(broadcast,1,'192.168.10.30')) and hashes(arps(broadcast,1,'192.168.10.30'))==hashes(arps(broadcast,2,'192.168.10.30'))==hashes(arps(broadcast,3,'192.168.10.30')),
 'Known Unicast Forwarding':table('known-before').get(MACS[1])==2 and len(echo(known,1))==3 and hashes(echo(known,1))==hashes(echo(known,2)) and len(echo(known,3))==0,
 'Unknown Unicast Flooding':MACS[1] not in table('unknown-before') and len(echo(unknown,1))==1 and hashes(echo(unknown,1))==hashes(echo(unknown,2))==hashes(echo(unknown,3)),
 'MAC Re-learning':table('unknown-after-reply').get(MACS[1])==2 and table('relearn-before').get(MACS[1])==2 and len(echo(relearn,1))==3 and hashes(echo(relearn,1))==hashes(echo(relearn,2)) and len(echo(relearn,3))==0,
 'ARP/FDB Separation':MACS[1] in obs['unknown-arp-retained']['output'].lower() and '192.168.10.20' in obs['unknown-arp-retained']['output'] and MACS[1] not in table('unknown-before') and not arps(unknown,1,'192.168.10.20') and len(echo(unknown,3))==1,
 'Packet Capture':len(docs)==15 and all(d['bytes']>=24 for d in docs.values()),
 'Actual Accelerated Aging':MACS[1] in table('ageing-before') and MACS[1] not in table('ageing-after-8s')
 }
 counts={name:{'pc%d'%i:{'frames':len(packets(name,i)),'pc1_to_pc2_echo':len(echo(name,i)),'broadcast_arp':len([p for p in packets(name,i) if p.get('op')==1 and p['dst']=='ff:ff:ff:ff:ff:ff'])} for i in [1,2,3]} for name in [first,known,broadcast,unknown,relearn]}
 print(json.dumps({'tests':tests,'counts':counts},indent=2))
 if not all(tests.values()):raise SystemExit(1)
if __name__=='__main__':main()
