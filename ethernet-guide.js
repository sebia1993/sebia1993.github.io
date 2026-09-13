(() => {
  const modes = {
    known: {title:'Known Unicast · PC2 포트로만 전달', detail:'PC1 → SW1 eth0 / port 1 수신 → eth1 / port 2 송신. 목적지 MAC: 00:50:79:66:68:01. PC2 FDB가 있으며, PC3 링크의 Echo Request는 0개입니다.', scenario:'02-known-unicast', flood:false},
    unknown: {title:'Unknown Unicast · PC2와 PC3 포트로 전달', detail:'PC1 → SW1 eth0 / port 1 수신 → eth1 / port 2 및 eth2 / port 3 송신. 목적지 MAC: 00:50:79:66:68:01. PC1 ARP는 남아 있지만 PC2 FDB가 없어 같은 Echo Request 1개가 PC3 링크에도 관찰됩니다.', scenario:'04-unknown-unicast', flood:true},
    broadcast: {title:'Broadcast · PC3를 찾는 ARP Request', detail:'PC1 → SW1 eth0 / port 1 수신 → eth1 / port 2 및 eth2 / port 3 송신. 목적지 MAC: ff:ff:ff:ff:ff:ff. PC3 IP 192.168.10.30을 묻는 ARP Request 1개가 PC2·PC3 링크에 전달됩니다. 이후 ICMP 경로는 이 그림에 표시하지 않습니다.', scenario:'03-broadcast', flood:true}
  };
  const buttons = document.querySelectorAll('[data-path]');
  buttons.forEach(button => button.addEventListener('click', () => {
    const mode = modes[button.dataset.path];
    if (!mode) return;
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.getElementById('path-title').textContent = mode.title;
    document.getElementById('path-detail').textContent = mode.detail;
    document.getElementById('path-pc3').setAttribute('visibility', mode.flood ? 'visible' : 'hidden');
    document.getElementById('path-evidence').href = '../ethernet-viewer.html?mode=packets&scenario=' + mode.scenario + '&point=pc3-sw1';
  }));
})();
