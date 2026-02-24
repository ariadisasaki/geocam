const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const captureBtn = document.getElementById("captureBtn");

const projectInput = document.getElementById("projectName");
const logoInput = document.getElementById("logoInput");

let latitude, longitude, elevation="--", accuracy="--";
let heading=0;
let logoImage=null;

const SECRET_SALT = "GEOCAM_PRO_V3_2026_SECURE";

// ================= CAMERA =================
navigator.mediaDevices.getUserMedia({
  video: { facingMode: "environment" }
}).then(stream => video.srcObject = stream);

// ================= SAVE PROJECT =================
projectInput.value = localStorage.getItem("project") || "";
projectInput.addEventListener("input",()=>{
  localStorage.setItem("project",projectInput.value);
});

// ================= LOGO =================
logoInput.addEventListener("change", e=>{
  const reader = new FileReader();
  reader.onload = function(evt){
    localStorage.setItem("logo", evt.target.result);
    loadLogo(evt.target.result);
  }
  reader.readAsDataURL(e.target.files[0]);
});

function loadLogo(data){
  logoImage = new Image();
  logoImage.src = data;
}
if(localStorage.getItem("logo")){
  loadLogo(localStorage.getItem("logo"));
}

// ================= GPS =================
navigator.geolocation.watchPosition(pos=>{
  latitude = pos.coords.latitude;
  longitude = pos.coords.longitude;
  elevation = pos.coords.altitude ? pos.coords.altitude.toFixed(1):"--";
  accuracy = pos.coords.accuracy.toFixed(1);

  document.getElementById("coords").innerText =
    `📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  document.getElementById("elevation").innerText =
    `⛰ ${elevation} m`;
  document.getElementById("accuracy").innerText =
    `📡 ±${accuracy} m`;
},{enableHighAccuracy:true});

// ================= COMPASS =================
function getDirection(deg){
  const dirs=["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg/45)%8];
}
window.addEventListener("deviceorientationabsolute", e=>{
  if(e.alpha!=null){
    heading = 360 - e.alpha;
    document.getElementById("heading").innerText =
      `🧭 ${heading.toFixed(0)}° ${getDirection(heading)}`;
  }
}, true);

// ================= TIME =================
setInterval(()=>{
  document.getElementById("datetime").innerText =
    "📅 "+ new Date().toLocaleString("id-ID",{timeZone:"Asia/Makassar"});
},1000);

// ================= SHA256 =================
async function sha256(message){
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b=>b.toString(16).padStart(2,"0")).join("");
}

// ================= FILENAME FORMAT =================
function formatFilename(date){
  const pad = n => n.toString().padStart(2,'0');
  return `GeoCamPro_${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.jpg`;
}

// ================= CAPTURE =================
captureBtn.addEventListener("click", async ()=>{

  if(!latitude || !longitude){
    alert("GPS belum terkunci. Tunggu beberapa detik.");
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(video,0,0);

  ctx.fillStyle="rgba(0,0,0,0.6)";
  ctx.fillRect(20,20,canvas.width-40,260);

  ctx.fillStyle="white";
  ctx.font="18px Arial";

  const now = new Date();
  const nowISO = now.toISOString();
  const project = projectInput.value || "-";

  ctx.fillText(`Proyek: ${project}`,40,60);
  ctx.fillText(`🧭 ${heading.toFixed(0)}° ${getDirection(heading)}`,40,90);
  ctx.fillText(`📡 ±${accuracy} m`,40,120);
  ctx.fillText(`⛰ ${elevation} m`,40,150);
  ctx.fillText(`📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,40,180);
  ctx.fillText(`📅 ${nowISO}`,40,210);

  const rawData = `${latitude}${longitude}${nowISO}${SECRET_SALT}`;
  const hash = await sha256(rawData);

  QRCode.toCanvas(hash,{width:120},(err,qrCanvas)=>{
    ctx.drawImage(qrCanvas,canvas.width-160,40);

    if(logoImage){
      ctx.drawImage(logoImage,canvas.width-180,180,120,60);
    }

    ctx.fillText("GeoCam Pro – Secure Mode",40,240);

    const link=document.createElement("a");
    link.download = formatFilename(now);
    link.href=canvas.toDataURL("image/jpeg",0.95);
    link.click();
  });
});
// ================= SERVICE WORKER =================
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('service-worker.js');
}
