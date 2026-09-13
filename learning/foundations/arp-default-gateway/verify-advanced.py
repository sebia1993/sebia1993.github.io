"""Read-only checks of stored Ethernet PCAP and console evidence; no lab access."""
from pathlib import Path
import json,struct,re,hashlib,sys
ROOT=Path(__file__).resolve().parent
NAMES=('10-arp-cache-gateway-down','11-forwarding-disabled')
def packets(path):
 b=path.read_bytes();assert b[:4] in (b'\xd4\xc3\xb2\xa1',b'\xa1\xb2\xc3\xd4')
 endian='<' if b[:4]==b'\xd4\xc3\xb2\xa1' else '>';assert struct.unpack_from(endian+'I',b,20)[0]==1
 out=[];off=24
 while off<len(b):
  sec,usec,n,wire=struct.unpack_from(endian+'IIII',b,off);off+=16;raw=b[off:off+n];off+=n;assert len(raw)==n and n==wire
  p={'number':len(out)+1,'epoch':sec+usec/1e6,'raw':raw.hex(),'src_mac':raw[6:12].hex(':'),'dst_mac':raw[:6].hex(':')}
  kind=int.from_bytes(raw[12:14],'big');ip=lambda x:'.'.join(map(str,x))
  if kind==0x0806:
   p.update(arp_op=int.from_bytes(raw[20:22],'big'),arp_src=ip(raw[28:32]),arp_dst=ip(raw[38:42]),arp_mac=raw[22:28].hex(':'))
  if kind==0x0800:
   p.update(src=ip(raw[26:30]),dst=ip(raw[30:34]),ttl=raw[22])
   h=14+(raw[14]&15)*4
   if raw[23]==1:p.update(icmp_type=raw[h],icmp_code=raw[h+1],icmp_signature=raw[h:].hex())
  out.append(p)
 assert off==len(b);return out

def echo(p,t=8):return p.get('icmp_type')==t and p.get('src')==('192.168.10.10' if t==8 else '192.168.20.10') and p.get('dst')==('192.168.20.10' if t==8 else '192.168.10.10')
def validate(root=ROOT):
 summary={}
 for name in NAMES:
  d=root/name;o=json.loads((d/'observations.json').read_text());boundary=o['recovery-router']['started_epoch']
  allp={p.stem:packets(p) for p in d.glob('*.pcap')};assert set(allp)=={'pc1-sw1','sw1-r1','r1-sw2'}
  fault={k:[p for p in v if p['epoch']<boundary] for k,v in allp.items()};rec={k:[p for p in v if p['epoch']>=boundary] for k,v in allp.items()}
  a=[p for p in fault['pc1-sw1'] if echo(p)];b=[p for p in fault['sw1-r1'] if echo(p)]
  assert len(a)==len(b)==3 and [p['raw'] for p in a]==[p['raw'] for p in b]
  assert all(p['dst_mac']=='02:42:d4:39:68:00' for p in a)
  assert not any(echo(p) for p in fault['r1-sw2'])
  assert not any(echo(p,0) for p in fault['pc1-sw1'])
  assert len(re.findall('timeout',o['fault-pc2']['output']))==3
  arp_req=[p for p in fault['pc1-sw1'] if p.get('arp_op')==1 and p.get('arp_src')=='192.168.10.10']
  arp_rep=[p for p in fault['pc1-sw1'] if p.get('arp_op')==2 and p.get('arp_src')=='192.168.10.1']
  if name.startswith('10'):
   assert '02:42:d4:39:68:00  192.168.10.1' in o['cache-before']['output'] and '02:42:d4:39:68:00  192.168.10.1' in o['cache-after-fault']['output']
   assert 'state DOWN' in o['fault-router-down']['output']
   assert not arp_req and not arp_rep
  else:
   assert 'net.ipv4.ip_forward = 0' in o['fault-forwarding-off']['output']
   assert 'arp table is empty' in o['cache-before']['output']
   assert len(arp_req)==len(arp_rep)==1
   assert arp_req[0]['arp_dst']=='192.168.10.1' and arp_rep[0]['arp_mac']=='02:42:d4:39:68:00'
   assert arp_req[0]['epoch']<arp_rep[0]['epoch']<a[0]['epoch']
  for point in allp:
   assert len([p for p in rec[point] if echo(p)])==3 and len([p for p in rec[point] if echo(p,0)])==3
  left=[p for p in rec['sw1-r1'] if echo(p)];right=[p for p in rec['r1-sw2'] if echo(p)]
  assert [p['icmp_signature'] for p in left]==[p['icmp_signature'] for p in right]
  assert all(x['ttl']==y['ttl']+1 for x,y in zip(left,right))
  assert 'net.ipv4.ip_forward = 1' in o['recovery-router']['output']
  for target,key in [('192.168.20.10','recovery-pc2'),('192.168.10.20','recovery-pc3')]:assert o[key]['output'].count('bytes from '+target)==3
  summary[name]={'passed':True,'recovery_boundary_epoch':boundary,'boundary_note':'Controller console command start; fault and recovery PC1 ping each have three requests and distinct sequence runs. Captures use the same GNS3 VM clock.','fault_gateway_arp_requests':len(arp_req),'fault_gateway_arp_replies':len(arp_rep),'fault_echo_requests':{k:sum(echo(p) for p in v) for k,v in fault.items()},'fault_echo_replies':sum(echo(p,0) for p in fault['pc1-sw1']),'fault_icmp_errors':{k:sum(p.get('icmp_type') in (3,4,5,11,12) for p in v) for k,v in fault.items()},'recovery_echo_requests':{k:sum(echo(p) for p in v) for k,v in rec.items()},'recovery_echo_replies':3,'fault_frame_numbers':{k:[p['number'] for p in v] for k,v in fault.items()},'recovery_frame_numbers':{k:[p['number'] for p in v] for k,v in rec.items()},'sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in d.glob('*.pcap')}}
 return {'passed':True,'scenarios':summary}
if __name__=='__main__':print(json.dumps(validate(Path(sys.argv[1]) if len(sys.argv)>1 else ROOT),ensure_ascii=False,indent=2))
