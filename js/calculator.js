const netBase = "192.168.";
const netBaseIP = document.getElementById("net_base_IP");

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


// === numerikus értékek ellenőrzése:csak valódi számot vagy számot tartalmazó, 
// nem üres stringet fogad el, egyébként null-t ad
function checkInt(value) {
   if (typeof value === "number") {
      return Number.isInteger(value) ? value : null;
   }
   if (typeof value === "string" && value.trim() !== "") {
      const numberValue = Number(value);
      return Number.isInteger(numberValue) ? numberValue : null;
   }
   return null;
}

// === alapállapot betöltése a sessionStorage-ból ===
const defaultSegments = { noOfRequests: 0, noOfSubnet: 0, hostRequests: []};
const storedKey = "HostRequests"
const allowedSegmentTypes = ["T", "U"]; 

function loadSegments() {
   try {
      const loadedSegments = JSON.parse(sessionStorage.getItem(storedKey));
// Objektum került betöltésre, ha nem, akkor alapértelmezett beállítás
      if (!loadedSegments || typeof loadedSegments !== "object") {
         return structuredClone(defaultSegments);
      }
// Objektumban benne van helyesen az igények tömbje, ha nem akkor üres tömböt adunk vissza
      const rawRequests = Array.isArray(loadedSegments.hostRequests) ? 
         loadedSegments.hostRequests.filter(r => r && typeof r === "object"): [];
// az igények feldolgozása során minden objektumot ellenőrzünk és normalizálunk
      const hostRequests = rawRequests.map((r, i) => ({...r,
// egységesen számként tároljuk a sorszámot
         hostRequestNo: Math.max(0, checkInt(r.hostRequestNo) ?? 0),
// helyes mezőnév, és csak megengedett értékek validálása
         hostType: allowedSegmentTypes.includes(r.hostType) ? r.hostType : "T",
// az elnevezése validálása
         hostName: typeof r.hostName === "string" && r.hostName.trim() !== "" ? r.hostName.trim(): `Net-${i + 1}`,
         hostRequest: checkInt(r.hostRequest) ?? 0,
      }));
// a null, "", true stb. értékek nem csúsznak át számként a 3. oktet megadásánál
      let noOfSubnet = checkInt(loadedSegments.noOfSubnet);
      if (noOfSubnet === null || noOfSubnet < 1 || noOfSubnet > 255) {
         noOfSubnet = defaultSegments.noOfSubnet;
      }
// az igények száma megegyezik a tömb hosszával
      let noOfRequests = checkInt(loadedSegments.noOfRequests);
      if (noOfRequests === null || noOfRequests < 0 || noOfRequests !== hostRequests.length) {
         noOfRequests = hostRequests.length;
      }
      return { noOfRequests, noOfSubnet, hostRequests };
   }         
   catch {
      return structuredClone(defaultSegments);
   }   
}

function saveSegments(savedSegments) {
   sessionStorage.setItem(storedKey, JSON.stringify(savedSegments));   
}


function enableSubnetInput() {
   const subnetField = document.getElementById("subnet_base_IP");
   const saveSubnetButton = document.getElementById("save_subnet")
   subnetField.readOnly = false;
   saveSubnetButton.disabled = false;
}

function disableSubnetInput() {
   const subnetField = document.getElementById("subnet_base_IP");
   const saveSubnetButton = document.getElementById("save_subnet")
   subnetField.readOnly = true;
   saveSubnetButton.disabled = true;
}


// === műveletek (események) ===
// === alhálózat 3. oktet mentés esemény ===
saveSubnetButton.addEventListener("click", () => {
   const subnetValue = Number(subnetField.value);
   if (subnetField.value === "" || !Number.isInteger(subnetValue) || subnetValue < 0 || subnetValue > 255) return;
   baseSegments.noOfSubnet = subnetValue;
   saveSegments(baseSegments);
   disableSubnetInput();
//   renderSegments();
});


let baseSegments = loadSegments()
const subnetField = document.getElementById("subnet_IP");
const saveSubnetButton = document.getElementById("save_subnet");
subnetField.value = baseSegments.noOfSubnet;
