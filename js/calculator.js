const netBase = "192.168.";
const inputNumberKeys = ["ArrowUp","ArrowDown","Tab"];

// input mező objektumok
const netBaseIP = document.getElementById("net_base_IP");
const subnetField = document.getElementById("subnet_IP");
const hostRequestField = document.getElementById("host_request");

// input gomb objektumok
const saveSubnetButton = document.getElementById("save_subnet");
const addSegmentButton = document.getElementById("add_segment");
const deleteSegmentsButton = document.getElementById("delete_segments");

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
      lastMaskBit: s.hostRequest <= 254 ? Math.ceil(Math.log2(s.hostRequest + 2)) : 0
   }));
}


// a HSL háttérszínhez a legnagyobb kontrasztú szövegszín (fekete vagy fehér)
function contrastTextColor(h, s, l) {
   // HSL -> RGB (0..1)
   s /= 100;
   l /= 100;
   const k = n => (n + h / 30) % 12;
   const a = s * Math.min(l, 1 - l);
   const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
   const [r, g, b] = [f(0), f(8), f(4)];

   // relatív fénysűrűség (WCAG)
   const lin = c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
   const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

   // kontrasztarány feketével és fehérrel, amelyik nagyobb, az nyer
   const withBlack = (L + 0.05) / 0.05;
   const withWhite = 1.05 / (L + 0.05);
   return withBlack > withWhite ? "#000" : "#fff";
}

// a szegmensek felrajzolása 
function renderSegments(segmentstoDraw) {
   const tbody = document.querySelector('.segments_table tbody');
   tbody.innerHTML = '';
   ipAddressTable.style.display = segmentstoDraw && segmentstoDraw.length > 0 ? "grid" : "none";
   ipAddressBlocks.forEach(block => {
      block.className = "ip-block";
      block.title = "";
      block.removeAttribute("style");
   });   

   if (!segmentstoDraw || segmentstoDraw.length === 0) {   
      document.getElementById("subnet_input").disabled = false;
      document.getElementById("segment_input").disabled = false;
      return;
   }

   document.getElementById("subnet_input").disabled = true;
   const netAddress = `${netBase}${baseSegments.noOfSubnet ?? 0}`;
   let segmentRow = 0;
   let segmentStart = 0;
   let runOut = false;
   
   while (!runOut && segmentRow < segmentstoDraw.length) {
      let htmlRow = '';
      const segment = segmentstoDraw[segmentRow];
      const tableRow = tbody.insertRow();
      if (segment.hostType === "U") {
         segmentStart = Math.ceil(segmentStart / (2 ** segment.lastMaskBit)) * (2 ** segment.lastMaskBit);
      }
      if (segmentStart + 2 ** segment.lastMaskBit > 256) {
         segment.lastMaskBit = 0;
      }

      htmlRow =   `<td class="host_requestno">${segment.hostRequestNo}</td>` +
                  `<td class="host_name"></td>` +
                  `<td class="host_type">${segment.hostType}</td>`;
      if (segment.lastMaskBit === 0) {
         htmlRow +=  `<td class="host_request">${Number(segment.hostRequest)} => ` + 
                     `${2 ** Math.ceil(Math.log2(Number(segment.hostRequest) + 2))}</td>` + 
                     `<td class="net_address">Nem fér el</td><td class="subnet_mask"></td>` +
                     `<td class="first_host"></td><td class="last_host"></td><td class="broadcast"></td>`;
         runOut = true;
      }            
      else {
         htmlRow +=  `<td class="host_request">${segment.hostRequest} => ${2 ** segment.lastMaskBit}</td>` +
                     `<td class="net_address">${netAddress}.${segmentStart} /${32 - segment.lastMaskBit}</td>` +
                     `<td class="subnet_mask">255.255.255.${256 - 2 ** segment.lastMaskBit}</td>` +
                     `<td class="first_host">${netAddress}.${segmentStart + 1}</td>` +
                     `<td class="last_host">${netAddress}.${segmentStart + 2 ** segment.lastMaskBit - 2}</td>` +
                     `<td class="broadcast">${netAddress}.${segmentStart + 2 ** segment.lastMaskBit - 1}</td>`;
         const blockSize = 2 ** segment.lastMaskBit;
         const hue = (segmentRow * 137.5) % 360;
         const backGroundColor = `hsl(${hue}, 60%, 25%)`;
         const textColor = contrastTextColor(hue, 60, 25);
         for (let i = segmentStart / 4; i < (segmentStart + blockSize) / 4; i++) {
            ipAddressBlocks[i].style.backgroundColor = backGroundColor;
            ipAddressBlocks[i].style.color = textColor;
            ipAddressBlocks[i].title = `${segment.hostName}: ${netAddress}.${segmentStart} /${32 - segment.lastMaskBit}`;
         }
         segmentStart += blockSize;
      }
      htmlRow +=  `<td class="host_buttons">` +
                  `<button class="segment_copy" aria-label="Másolás" title="Másolás">` +
                  `<i class="fa-solid fa-copy" aria-hidden="true"></i></button>` +
                  `<button class="segment_delete" aria-label="Törlés" title="Törlés">` +
                  `<i class="fa-solid fa-trash-can" aria-hidden="true"></i></button></td>`;      
      tableRow.dataset.id = segment.hostRequestNo;
      tableRow.innerHTML = htmlRow;
      tableRow.querySelector(".host_name").textContent = segment.hostName;
      segmentRow++;
   }
   document.getElementById("segment_input").disabled = runOut || segmentStart >= 256;
}


// az utólagos host típus vezérlés, ha már nem tervezett "U" típusú host van a listában,
// akkor a "T" típusú opció letiltása és a "U" típus kiválasztása
function updateHostTypeControl() {
   const hasPost = baseSegments.hostRequests.some(s => s.hostType === "U");
   const typeSelect = document.getElementById("host_status");
   const plannedOption = [...typeSelect.options].find(o => o.value === "T");
   if (plannedOption) {
      plannedOption.disabled = hasPost;
   }
   if (hasPost) typeSelect.value = "U";
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
   updateHostTypeControl();
});

subnetField.addEventListener("keydown", e => {
   if (!inputNumberKeys.includes(e.key)) e.preventDefault();
});
subnetField.addEventListener("paste", e => e.preventDefault());


addSegmentButton.addEventListener("click", () => {
   const hostRequest = checkInt(hostRequestField.value);
   if (!hostRequest || hostRequest > 255) return;

   const hostType = document.getElementById("host_status").value;
   if (hostType === "T" && baseSegments.hostRequests.some(s => s.hostType === "U")) return;

   const defaultName = Math.max(0, ...baseSegments.hostRequests
      .map(s => Number(s.hostRequestNo))
      .filter(Number.isFinite)) + 1;
   const typedName = document.getElementById("host_name").value.trim(); 
   const hostName = typedName !== "" ? typedName: `Net-${defaultName}`;
   const hostRequestNo = defaultName;

   const subnetValue = checkInt(subnetField.value);
   if (subnetValue !== null && subnetValue <= 255) baseSegments.noOfSubnet = subnetValue;   
   baseSegments.hostRequests.push({ hostRequestNo, hostType, hostName, hostRequest });
   document.getElementById("host_request").value = 1;
   document.getElementById("host_name").value = "";
   saveSegments(baseSegments);
   const calculatedSegments = calculateSegments(baseSegments.hostRequests);
   renderSegments(calculatedSegments);
   updateHostTypeControl();
});

hostRequestField.addEventListener("keydown", e => {
   if (!inputNumberKeys.includes(e.key)) e.preventDefault();
});
hostRequestField.addEventListener("paste", e => e.preventDefault());

document.querySelector('.segments_table tbody').addEventListener('click', b => {
   const button = b.target.closest('.segment_delete');
   if (!button) return;

   const id = Number(button.closest('tr').dataset.id);
   baseSegments.hostRequests = baseSegments.hostRequests.filter(s => s.hostRequestNo !== id);
   saveSegments(baseSegments);
   renderSegments(calculateSegments(baseSegments.hostRequests));
   updateHostTypeControl();
});


document.querySelector('.segments_table tbody').addEventListener('click', b => {
   const button = b.target.closest('.segment_copy');
   if (!button) return;

   const row = button.closest('tr');
   const cell = className => row.querySelector(`.${className}`).textContent;

   const lines = [
      `${cell("host_name")} (${cell("host_type")}): ${cell("host_request")}`,
      cell("net_address"),
   ];
   // ha elfér, az első, utolsó és broadcast cím is kell
   if (cell("first_host") !== "") {
      lines.push(cell("subnet_mask"),cell("first_host"), cell("last_host"), cell("broadcast"));
   }

   navigator.clipboard.writeText(lines.join("\n"))
      .catch(err => console.error("Másolás sikertelen:", err));
});


// === összes szegmens törlése ===
deleteSegmentsButton.addEventListener("click", () => {
   if (baseSegments.hostRequests.length === 0) return;
   if (!confirm("Biztosan törlöd az összes szegmenst?")) return;

   baseSegments.noOfSubnet = null;
   baseSegments.hostRequests = [];
   subnetField.value = 0;
   saveSegments(baseSegments);
   renderSegments(calculateSegments(baseSegments.hostRequests));
   updateHostTypeControl();
   document.getElementById("host_status").value = "T";
});


// Induláskor lefutó kód, ami felrajzolja az aktuális állapotot
// ha volt már tárolt adat, az nem veszik el, mert jön a Session Storage-ból 
let baseSegments = loadSegments();
netBaseIP.textContent = netBase;
subnetField.value = baseSegments.noOfSubnet ?? 0;
buildIPAddressTable();
const calculatedSegments = calculateSegments(baseSegments.hostRequests);
renderSegments(calculatedSegments);
updateHostTypeControl();


