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


// === Numerikus értékek ellenőrzése:csak valódi számot vagy számot tartalmazó, nem üres stringet fogad el,
//  egyébként null-t ad
function toInt(value) {
   if (typeof value === "number") {
      return Number.isInteger(value) ? value : null;
   }
   if (typeof value === "string" && value.trim() !== "") {
      const n = Number(value);
      return Number.isInteger(n) ? n : null;
   }
   return null;
}

// === alapállapot betöltése a sessionStorage-ból ===
const defaultSegments = { noOfRequests: 0, noOfSubnet: 0, segmentRequests: []};
const storedSegments = "Teszt"
const allowedSegmentTypes = ["T", "U"]; 

function loadSegments() {
   try {
      const loadedSegments = JSON.parse(sessionStorage.getItem(storedSegments));
// Objektum került betöltésre, ha nem, akkor alapértelmezett beállítás
      if (!loadedSegments || typeof loadSegments !== "object") {
         return structuredClone(defaultSegments);
      }
// Objektumban benne van helyesen az igények tömbje, ha nem akkor üres tömböt adunk vissza
      const rawRequests = Array.isArray(loadedSegments.segmentRequests) ? 
         loadedSegments.segmentRequests.filter(r => r && typeof r === "object"): [];

      const segmentRequests = rawRequests.map((r, i) => ({...r,
// egységesen számként tároljuk a sorszámot
         subnetOrderNo: Math.max(0, toInt(r.subnetOrderNo) ?? 0),
// helyes mezőnév, és csak megengedett értékek validálása
         subnetType: allowedSegmentTypes.includes(r.subnetType) ? r.subnetType : "T",
// az elnevezése validálása
         subnetName: typeof r.subnetName === "string" && r.subnetName.trim() !== "" ? r.subnetName.trim(): `Hálózat ${i + 1}`,
      }));
// a null, "", true stb. értékek nem csúsznak át számként
      let noOfSubnet = toInt(loadedSegments.noOfSubnet);
      if (noOfSubnet === null || noOfSubnet < 1 || noOfSubnet > 255) {
         noOfSubnet = defaultSegments.noOfSubnet;
      }
// az igények száma megegyezik a tömb hosszával
      let noOfRequests = toInt(loadedSegments.noOfRequests);
      if (noOfRequests === null || noOfRequests < 0 || noOfRequests !== segmentRequests.length) {
         noOfRequests = segmentRequests.length;
      }
      return { noOfRequests, noOfSubnet, segmentRequests };
   }         
   catch {
      return structuredClone(defaultSegments);
   }   
}

function saveSegments() {
   sessionStorage.setItem(storedSegments, JSON.stringify(loadSegments));   
}






function enableSubnetInput() {
   const subnetField = document.getElementById("subnet_base_IP");
   const saveSubnetButton = document.getElementById("save_subnet")
   subnetField.ReadOnly = false;
   saveSubnetButton.Disabled = false;
}

function disableSubnetInput() {
   const subnetField = document.getElementById("subnet_base_IP");
   const saveSubnetButton = document.getElementById("save_subnet")
   subnetField.ReadOnly = true;
   saveSubnetButton.Disabled = true;
}


// = műveletek (események) ===
let baseSegments = loadSegments()
const subnetField = document.getElementById("subnet_IP");
const saveSubnetButton = document.getElementById("save_subnet");
subnetField.value = baseSegments.noOfSubnet;

saveSubnetButton.addEventListener("click", () => {
   const subnetValue = Number(subnetField.value);
   if (subnetField.value === "" || !Number.isInteger(subnetValue) || subnetField < 0 || subnetField > 255) return;
   baseSegments.noOfSubnet = subnetField;
   saveSegments();
//   disableSubnetInput();
//   renderSegments();
});

netBaseIP.textContent = netBase;
