document.addEventListener("DOMContentLoaded", () => {

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const captureBtn = document.getElementById("capture");
const projectInput = document.getElementById("projectName");
const logoInput = document.getElementById("logoInput");

let latitude=null, longitude=null, accuracy=0;
let heading=0;
let locationName="Mencari lokasi...";
let userLogo=null;

const SECRET_SALT="GEOCAM_SECURE_V3";


// ================= CAMERA =================
navigator.mediaDevices.getUserMedia({
  video:{ facingMode:"environment" }
})
.then(stream=> video.srcObject=stream)
.catch(err=> alert("Camera error: "+err.message));


// ================= LOAD LOGO =================
logoInput.addEventListener("change", function(){
  const file=this.files[0];
  if(!file) return;

  const reader=new FileReader();
  reader.onload=function(e){
    userLogo=new Image();
    userLogo.src=e.target.result;
  }
  reader.readAsDataURL(file);
});


// ================= GPS =================
if(navigator.geolocation){
  navigator.geolocation.watchPosition(
    async pos=>{
      latitude=pos.coords.latitude;
      longitude=pos.coords.longitude;
      accuracy=pos.coords.accuracy;

      document.getElementById("coords").innerText =
        `📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

      document.getElementById("accuracy").innerText =
        `📡 ±${Math.round(accuracy)} m`;

      document.getElementById("datetime").innerText =
        `📅 ${new Date().toLocaleString()}`;

      // Reverse geocoding
      try{
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        const data = await res.json();

        const addr=data.address;
        const desa=addr.village || addr.town || addr.city || "";
        const kab=addr.county || "";
        const prov=addr.state || "";
        const negara=addr.country || "";

        locationName=`📍 ${desa}, ${kab}, ${prov}, ${negara}`;
        document.getElementById("locationName").innerText = locationName;

      }catch(e){
        console.log("Reverse geocoding error", e);
      }

    },
    err=>console.log(err),
    {enableHighAccuracy:true}
  );
}


// ================= COMPASS =================
window.addEventListener("deviceorientation", e=>{
  if(e.alpha!==null){
    heading=Math.round(e.alpha);
    document.getElementById("heading").innerText=`🧭 ${heading}°`;
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
  ctx.fillRect(20,20,canvas.width-40,260);

  ctx.fillStyle="white";
  ctx.font="18px Arial";

  const now=new Date();
  const nowISO=now.toISOString();

  ctx.fillText(`${projectInput.value||"-"}`,40,60);
  ctx.fillText(`🧭 ${heading||0}°`,40,90);
  ctx.fillText(`📡 ±${Math.round(accuracy)} m`,40,120);
  ctx.fillText(`📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,40,150);
  ctx.fillText(locationName,40,180);
  ctx.fillText(`📅 ${nowISO}`,40,210);

  // Logo
  if(userLogo){
    ctx.drawImage(userLogo,canvas.width-150,canvas.height-150,120,120);
  }

  const rawData=`${latitude}${longitude}${nowISO}${SECRET_SALT}`;
  const hash=await sha256(rawData);

  QRCode.toCanvas(hash,{width:100},(err,qrCanvas)=>{
    if(!err){
      ctx.drawImage(qrCanvas,canvas.width-130,40);
    }

    const link=document.createElement("a");
    link.download=formatFilename(now);
    link.href=canvas.toDataURL("image/jpeg",0.95);
    link.click();
  });

});

});
