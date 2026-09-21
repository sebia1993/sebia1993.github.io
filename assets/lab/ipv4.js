export function parseIPv4(value) {
  if (typeof value !== 'string') throw new TypeError('IPv4 주소는 문자열로 입력하세요.');
  const parts = value.trim().split('.');
  if (parts.length !== 4 || parts.some(part => !/^(0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255)) {
    throw new RangeError('IPv4 주소는 0~255의 4개 숫자로 입력하세요. 앞자리 0은 사용하지 않습니다.');
  }
  return parts.reduce((value, part) => value * 256 + Number(part), 0);
}

function checkPrefix(prefix) {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new RangeError('Prefix는 0~32의 정수여야 합니다.');
  }
}

function formatIPv4(value) {
  return [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.');
}

export function subnetInfo(ip, prefix) {
  const address = parseIPv4(ip);
  checkPrefix(prefix);
  const size = 2 ** (32 - prefix);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (address & mask) >>> 0;
  const last = network + size - 1;
  const special = prefix >= 31;
  return Object.freeze({
    address: formatIPv4(address), prefix, mask: formatIPv4(mask), network: formatIPv4(network),
    broadcast: special ? null : formatIPv4(last),
    firstHost: formatIPv4(special ? network : network + 1),
    lastHost: formatIPv4(special ? last : last - 1), hostCount: special ? size : size - 2,
    type: prefix === 32 ? 'host-route' : prefix === 31 ? 'point-to-point' : 'subnet',
    description: prefix === 32 ? '/32는 단일 주소의 Host Route입니다. 일반 LAN Broadcast를 적용하지 않습니다.'
      : prefix === 31 ? '/31은 RFC 3021 Point-to-Point 문맥에서 두 주소를 사용합니다. 일반 LAN Broadcast를 적용하지 않습니다.'
      : prefix === 0 ? '/0은 전체 IPv4 범위입니다. 계산된 Host 수에는 예약·특수 용도 주소도 포함되어 모두 할당 가능한 것은 아닙니다.'
      : '일반 Subnet 계산: Network와 Broadcast를 제외한 주소 범위입니다. 실제 주소 사용 가능 여부는 용도와 환경을 확인하세요.'
  });
}

export function sameSubnet(a, b, prefix) {
  checkPrefix(prefix);
  const left = parseIPv4(a), right = parseIPv4(b);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (left & mask) === (right & mask);
}
