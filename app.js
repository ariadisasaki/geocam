document.addEventListener("DOMContentLoaded", () => {

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const captureBtn = document.getElementById("capture");
const projectInput = document.getElementById("projectName");

let latitude=null, longitude=null, accuracy=0;
let heading=0;
const SECRET_SALT="GEOCAM_SECURE_V3";


// ================= CAMERA =================
navigator.mediaDevices.getUserMedia({
  video:{ facingMode:"environment" }
})
.then(stream=>{
  video.srcObject=stream;
})
.catch(err=>{
  alert("Camera error: "+err.message);
});


// ================= GPS =================
if(navigator.geolocation){
  navigator.geolocation.watchPosition(
    pos=>{
      latitude=pos.coords.latitude;
      longitude=pos.coords.longitude;
      accuracy=pos.coords.accuracy;

      document.getElementById("coords").innerText =
        `📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

      document.getElementById("accuracy").innerText =
        `📡 ±${Math.round(accuracy)} m`;

      document.getElementById("datetime").innerText =
        `📅 ${new Date().toLocaleString()}`;
    },
    err=>{
      console.log("GPS error:",err);
    },
    {enableHighAccuracy:true}
  );
}


// ================= COMPASS =================
window.addEventListener("deviceorientation", e=>{
  if(e.alpha!==null){
    heading=Math.round(e.alpha);
    document.getElementById("heading").innerText =
      `🧭 ${heading}°`;
  }
});


// ================= SHA256 =================
async function sha256(text){
  const buf=new TextEncoder().encode(text);
  const hash=await crypto.subtle.digest("SHA-256",buf);
  return Array.from(new Uint8Array(hash))
  .map(b=>b.toString(16).padStart(2,"0"))
  .join("");
}


// ================= FILENAME =================
function formatFilename(date){
  const pad=n=>n.toString().padStart(2,"0");
  return `GeoCamPro_${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.jpg`;
}


// ================= CAPTURE =================
if(captureBtn){
captureBtn.addEventListener("click", async ()=>{

  if(!latitude || !longitude){
    alert("GPS belum terkunci...");
    return;
  }

  canvas.width=video.videoWidth;
  canvas.height=video.videoHeight;
  const ctx=canvas.getContext("2d");

  ctx.drawImage(video,0,0);

  ctx.fillStyle="rgba(0,0,0,0.6)";
  ctx.fillRect(20,20,canvas.width-40,200);

  ctx.fillStyle="white";
  ctx.font="18px Arial";

  const now=new Date();
  const nowISO=now.toISOString();
  const safeHeading=heading?heading:0;

  ctx.fillText(`${projectInput.value||"-"}`,40,60);
  ctx.fillText(`🧭 ${safeHeading}°`,40,90);
  ctx.fillText(`📡 ±${Math.round(accuracy)} m`,40,120);
  ctx.fillText(`📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,40,150);
  ctx.fillText(`📅 ${nowISO}`,40,180);

  const rawData=`${latitude}${longitude}${nowISO}${SECRET_SALT}`;
  const hash=await sha256(rawData);

  QRCode.toCanvas(hash,{width:120},(err,qrCanvas)=>{
    if(!err){
      ctx.drawImage(qrCanvas,canvas.width-150,40);
    }

    const link=document.createElement("a");
    link.download=formatFilename(now);
    link.href=canvas.toDataURL("image/jpeg",0.95);
    link.click();
  });

});
}

});
