const netBase = "192.168.";
const inputNumberKeys = ["ArrowUp","ArrowDown","Tab"];

// input mező objektumok
const netBaseIP = document.getElementById("net_base_IP");
const subnetField = document.getElementById("subnet_IP");
const hostRequestField = document.getElementById("host_request");

// input gomb objektumok
const saveSubnetButton = document.getElementById("save_subnet");
const addSegmentButton = document.getElementById("add_segment");


const ipAddressTable = document.querySelector(".ipaddresses");
const ipAddressBlocks = [];

// IP blokkok létrehozása
function buildIPAddressTable() {
   for (let segments = 0; segments <= 63; segments++) {
      const ipAddressCells = document.createElement("div");
      ipAddressCells.className = "ip-block";
      ipAddressCells.textContent = `${segments * 4}...${segments * 4 + 3}`;
      ipAddressBlocks.push(ipAddressCells);
      ipAddressTable.append(ipAddressCells);
   }
}


// numerikus értékek ellenőrzése: csak nem negatív egész számot vagy
// csak számjegyekből álló sztringet fogad el, egyébként null
function checkInt(value) {
   if (typeof value === "number") {
      return Number.isSafeInteger(value) && value >= 0 ? value : null;
   }
   if (typeof value === "string" && /^\s*\d+\s*$/.test(value)) {
      const valueFromString = Number(value);
      return Number.isSafeInteger(valueFromString) ? valueFromString : null ;
   }
   return null;
}

// === alapállapot betöltése a sessionStorage-ból ===
const defaultSegments = { noOfSubnet: null, hostRequests: []};
const storedKey = "hostRequests";
const allowedSegmentTypes = ["T", "U"]; 

function loadSegments() {
   try {
      const loadedSegments = JSON.parse(sessionStorage.getItem(storedKey));
// Objektum került betöltésre, ha nem, akkor alapértelmezett beállítás
      if (!loadedSegments || typeof loadedSegments !== "object" || Array.isArray(loadedSegments)) {
         return structuredClone(defaultSegments);

      }
// Objektumban benne van helyesen az igények tömbje, ha nem akkor üres tömböt adunk vissza
      const rawRequests = Array.isArray(loadedSegments.hostRequests) ? 
         loadedSegments.hostRequests.filter(r => r && typeof r === "object"): [];
// az igények feldolgozása során minden objektumot ellenőrzünk és normalizálunk
      const hostRequests = rawRequests
         .map(r => {
            const type = typeof r.hostType === "string" ? r.hostType.trim().toUpperCase() : "";
            return {
// helyes mezőnév, és csak megengedett értékek validálása
               hostType: allowedSegmentTypes.includes(type) ? type : null,
// az elnevezése validálása
               hostName: typeof r.hostName === "string" ? r.hostName.trim(): "",
               hostRequest: checkInt(r.hostRequest) ?? 0,
            };
         })
         .filter(r => r.hostType !== null && r.hostRequest > 0)
         .map((r, i) => ({ 
            ...r, 
            hostRequestNo: i + 1,
            hostName: r.hostName || `Net-${i + 1}`,
         }));
// a null, "", true stb. értékek nem csúsznak át számként a 3. oktet megadásánál
      let noOfSubnet = checkInt(loadedSegments.noOfSubnet);
      if (noOfSubnet === null || noOfSubnet > 255) { noOfSubnet = defaultSegments.noOfSubnet; }
      return { noOfSubnet, hostRequests };
   }         
   catch {
      return structuredClone(defaultSegments);
   }   
}

function saveSegments(savedSegments) {
   sessionStorage.setItem(storedKey, JSON.stringify(savedSegments));   
}


// a szegmensek kalkulációja
function calculateSegments(sourceSegments) {
// T: hostRequest szerint csökkenő (VLSM), azonos méretnél sorszám szerint
   const plannedItems = sourceSegments
      .filter(s => s.hostType === "T")
      .sort((a, b) => b.hostRequest - a.hostRequest || a.hostRequestNo - b.hostRequestNo);

// U: sorszám szerint növekvő (utólag felvett tételek)
   const postItems = sourceSegments
      .filter(s => s.hostType === "U")
      .sort((a, b) => a.hostRequestNo - b.hostRequestNo);

   // Ami nem T vagy U, az kimarad
   return [...plannedItems, ...postItems].map(s => ({
      ...s,
// A hosztok számához +1 kell az alhálózat címének, +1 a szórási címnek;
// ebből adódik, hány hosztbit kell (2..8):
//  2^2 = 4 cím a legkisebb blokk: legfeljebb 2 hoszt + 2 foglalt
//  2^8 = 256 cím a legnagyobb blokk: legfeljebb 254 hoszt + 2 foglalt
//  254 hoszt fölött 0: nem fér el
      LastMaskBit: s.hostRequest <= 254 ? Math.ceil(Math.log2(s.hostRequest + 2)) : 0
   }));
}


// a szemgmensek felrajzolása 
function renderSegments(segmentstoDraw) {

}


// === műveletek (események) ===
// === alhálózat 3. oktet mentés esemény ===
saveSubnetButton.addEventListener("click", () => {
   const subnetValue = checkInt(subnetField.value);
   if (subnetValue === null || subnetValue > 255) return;
   baseSegments.noOfSubnet = subnetValue;
   saveSegments(baseSegments);
const calculatedSegments = calculateSegments(baseSegments.hostRequests);
renderSegments(calculatedSegments);
});

subnetField.addEventListener("keydown", e => {
   if (!inputNumberKeys.includes(e.key)) e.preventDefault();
});
subnetField.addEventListener("paste", e => e.preventDefault());


addSegmentButton.addEventListener("click", () => {
   const hostRequest = checkInt(hostRequestField.value);
   if (!hostRequest || hostRequest > 255) return;

   const defaultName = Math.max(0, ...baseSegments.hostRequests
      .map(s => Number(s.hostRequestNo))
      .filter(Number.isFinite)) + 1;
   const hostType = document.getElementById("host_status").value;
   const typedName = document.getElementById("host_name").value.trim(); 
   const hostName = typedName !== "" ? typedName: `Net-${defaultName}`;
   const hostRequestNo = defaultName;

   baseSegments.hostRequests.push({ hostRequestNo, hostType, hostName, hostRequest });
   saveSegments(baseSegments);
   const calculatedSegments = calculateSegments(baseSegments.hostRequests);
   renderSegments(calculatedSegments);

});

hostRequestField.addEventListener("keydown", e => {
   if (!inputNumberKeys.includes(e.key)) e.preventDefault();
});
hostRequestField.addEventListener("paste", e => e.preventDefault());


// Induláskor lefutó kód, ami felrajzolja az aktuális állapotot
// ha volt már tárolt adat, az nem veszik el, mert jön a Session Storage-ból 
let baseSegments = loadSegments();
netBaseIP.textContent = netBase;
subnetField.value = baseSegments.noOfSubnet ?? 0;
buildIPAddressTable();
const calculatedSegments = calculateSegments(baseSegments.hostRequests);
renderSegments(calculatedSegments);


