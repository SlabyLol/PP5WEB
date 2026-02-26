import * as THREE from 'three';

let active = false, platform = 'PC', currentLevel = 1;
let moveInp = { x: 0, y: 0 }, lookInp = { x: 0, y: 0 }, rot = { lat: 0, lon: -90 };
const colliders = [];
const raycaster = new THREE.Raycaster();

// --- SCENE ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.1);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- LICHT (HELL) ---
const flash = new THREE.SpotLight(0xffffff, 250, 80, 0.6, 0.5);
camera.add(flash); flash.position.set(0,0,0.2); flash.target.position.set(0,0,-1);
camera.add(flash.target); scene.add(camera);
scene.add(new THREE.AmbientLight(0x404040, 0.8));

// --- WELT ---
const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
const createW = (w,h,d, x,y,z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat);
    m.position.set(x,y,z); scene.add(m); 
    const box = new THREE.Box3().setFromObject(m);
    colliders.push({box, mesh: m});
    return m;
};

// Flur
createW(1, 8, 100, 7, 4, -40); createW(1, 8, 100, -7, 4, -40);
const door = createW(14, 8, 1, 0, 4, -45); // Die Tür am Ende

// Poppy Modell
const poppy = new THREE.Group();
poppy.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.4), new THREE.MeshStandardMaterial({color: 0xff00ff})));
poppy.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({color: 0xffcccc})).translateY(0.6));
poppy.position.set(0, 0.5, -55); poppy.visible = false;
scene.add(poppy);

// GrabPack
const hB = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.3,0.1), new THREE.MeshStandardMaterial({color: 0x0088ff}));
const hR = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.3,0.1), new THREE.MeshStandardMaterial({color: 0xff0000}));
camera.add(hB); camera.add(hR); hB.position.set(-0.7,-0.5,-1); hR.position.set(0.7,-0.5,-1);

const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.7), new THREE.MeshBasicMaterial({color: 0xff0000}));
screen.position.set(6.4, 1.8, -15); screen.rotation.y = -Math.PI/2; scene.add(screen);

// --- STORY LOGIK ---
const dialogs = ["Du bist also gekommen...", "Sie beobachten uns.", "Komm mit mir in die Tiefe."];

function startPoppyTalk() {
    const box = document.getElementById('dialog-container');
    const text = document.getElementById('dialog-text');
    box.style.display = 'block';
    let i = 0;
    const interval = setInterval(() => {
        if(i < dialogs.length) { text.innerText = dialogs[i]; i++; }
        else { clearInterval(interval); box.style.display = 'none'; loadLevel2(); }
    }, 3000);
}

function loadLevel2() {
    currentLevel = 2;
    document.getElementById('game-msg').innerText = "LEVEL 2";
    door.position.y = 4; // Tür zu
    camera.position.set(0, 1.8, -60); // In den neuen Raum teleportieren
}

// --- CONTROLS ---
window.startGame = (p) => { platform = p; active = true; document.getElementById('menu-overlay').style.display = 'none'; if(p === 'Mobile') document.getElementById('mobile-ui').style.display = 'block'; else renderer.domElement.requestPointerLock(); };

window.shoot = (side) => {
    const h = side === 'blue' ? hB : hR; h.position.z = -15;
    raycaster.set(camera.position, new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion));
    const hits = raycaster.intersectObjects(scene.children);
    if(hits.length > 0 && hits[0].object === screen && side === 'blue') {
        screen.material.color.set(0x00ff00);
        door.position.y = 12; // Tür auf
        poppy.visible = true;
        startPoppyTalk();
    }
    setTimeout(() => h.position.z = -1, 400);
};

const initJoy = (id, knobId, cb) => {
    const z = document.getElementById(id), k = document.getElementById(knobId);
    z.onpointermove = (e) => { const r = z.getBoundingClientRect(), x = (e.clientX-r.left-50)/50, y = (e.clientY-r.top-50)/50; k.style.transform = `translate(${x*20}px,${y*20}px)`; cb(x,y); };
    z.onpointerup = () => { k.style.transform = 'translate(0,0)'; cb(0,0); };
};
initJoy('joy-move', 'knob-move', (x,y) => moveInp = {x,y}); initJoy('joy-look', 'knob-look', (x,y) => lookInp = {x,y});

let keys = {}; window.onkeydown = (e) => keys[e.code] = true; window.onkeyup = (e) => keys[e.code] = false;

function loop() {
    requestAnimationFrame(loop); if(!active) return;
    if(platform === 'Mobile') { rot.lon += lookInp.x * 3.5; rot.lat -= lookInp.y * 3.0; }
    else { window.onmousemove = (e) => { if(document.pointerLockElement) { rot.lon += e.movementX*0.15; rot.lat -= e.movementY*0.15; }}; }
    rot.lat = Math.max(-85, Math.min(85, rot.lat));
    camera.lookAt(new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90-rot.lat), THREE.MathUtils.degToRad(rot.lon)).add(camera.position));
    
    const old = camera.position.clone();
    if(keys['KeyW']) camera.translateZ(-0.2); if(keys['KeyS']) camera.translateZ(0.2);
    if(platform === 'Mobile') { camera.translateZ(moveInp.y*0.2); camera.translateX(moveInp.x*0.2); }
    camera.position.y = 1.8;
    
    const pBox = new THREE.Box3().setFromCenterAndSize(camera.position, new THREE.Vector3(1,2,1));
    if(colliders.some(c => pBox.intersectsBox(c.box) && c.mesh.position.y < 5)) camera.position.copy(old);
    
    renderer.render(scene, camera);
}
loop();
