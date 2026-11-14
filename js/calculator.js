const netBase = "192.168."

/* IP blokkok létrehozása */
const ipAddressTable = document.querySelector('.ipaddresses');
const ipAddressBlocks = [];

for (let segments = 0; segments <= 63; segments++) {
  const ipAddressCells = document.createElement('div');
  ipAddressCells.className = 'ip-block';
  ipAddressCells.textContent = `${segments * 4}...${segments * 4 + 3}`;
  ipAddressBlocks.push(ipAddressCells);
  ipAddressTable.append(ipAddressCells);
}

netBaseIP = document.getElementById("net_base_IP")
netBaseIP.textContent = netBase

