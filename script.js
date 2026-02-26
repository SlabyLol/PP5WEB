import * as THREE from 'three';

let active = false, platform = 'PC', currentLevel = 1, isTalking = false, isCutscene = false;
let moveInp = { x: 0, y: 0 }, lookInp = { x: 0, y: 0 }, rot = { lat: 0, lon: -90 };
const colliders = [];
const raycaster = new THREE.Raycaster();

// SCENE SETUP
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.05);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const flash = new THREE.SpotLight(0xffffff, 200, 100, 0.6, 0.5);
camera.add(flash); flash.position.set(0,0,0.1); flash.target.position.set(0,0,-1);
camera.add(flash.target); scene.add(camera);
scene.add(new THREE.AmbientLight(0x404040, 0.5));

const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
const createW = (w,h,d, x,y,z, color = 0x1a1a1a) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({color}));
    m.position.set(x,y,z); scene.add(m); 
    colliders.push(new THREE.Box3().setFromObject(m));
    return m;
};

// LVL 1 OBJECTS
const wallL = createW(1, 8, 100, 7, 4, -40);
const wallR = createW(1, 8, 100, -7, 4, -40);
const door = createW(14, 8, 1, 0, 4, -45);
const scanner = new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.7), new THREE.MeshBasicMaterial({color: 0xff0000}));
scanner.position.set(6.4, 1.8, -15); scanner.rotation.y = -Math.PI/2; scene.add(scanner);

// POPPY BABY
const poppy = new THREE.Group();
poppy.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.2), new THREE.MeshStandardMaterial({color: 0xffffff})));
const pHead = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshStandardMaterial({color: 0xffcccc}));
pHead.position.y = 0.35; poppy.add(pHead);
const pHair = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.4), new THREE.MeshStandardMaterial({color: 0xff0000}));
pHair.position.y = 0.52; poppy.add(pHair);
poppy.position.set(0, 0.3, -50); poppy.visible = false;
scene.add(poppy);

// HANDS
const hB = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.3,0.1), new THREE.MeshStandardMaterial({color: 0x0088ff}));
const hR = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.3,0.1), new THREE.MeshStandardMaterial({color: 0xff0000}));
camera.add(hB); camera.add(hR); hB.position.set(-0.7,-0.5,-1); hR.position.set(0.7,-0.5,-1);

// --- LEVEL 2 ENGINE ---
function buildLevel2() {
    currentLevel = 2;
    scene.children.filter(o => o.type === "Mesh" && o !== hB && o !== hR).forEach(o => scene.remove(o));
    colliders.length = 0;

    // Factory Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({color: 0x050505}));
    floor.rotation.x = -Math.PI/2; scene.add(floor);

    // Factory Walls
    createW(200, 30, 2, 0, 15, -100); // Back
    createW(2, 30, 200, 100, 15, 0); // Right
    createW(2, 30, 200, -100, 15, 0); // Left

    // Conveyor Belts
    createW(5, 1, 60, -15, 0.5, -40, 0x222222);
    createW(5, 1, 60, 15, 0.5, -40, 0x222222);

    // Big Machine
    createW(15, 15, 15, 0, 7.5, -80, 0x440000);
    
    poppy.position.set(2, 0.3, 10);
    poppy.visible = true;
    scene.add(poppy);
}

// --- LOGIC ---
window.startGame = (p) => { platform = p; active = true; document.getElementById('menu-overlay').style.display = 'none'; if(p === 'Mobile') document.getElementById('mobile-ui').style.display = 'block'; else renderer.domElement.requestPointerLock(); };

const dialogs = ["Du hast mich befreit...", "Sieh mich an, ich bin so klein.", "Folge mir in die Fabrik!"];
function startTalk() {
    isTalking = true;
    const box = document.getElementById('dialog-container'), textEl = document.getElementById('dialog-text');
    box.style.display = 'block';
    let i = 0;
    const interval = setInterval(() => {
        if(i < dialogs.length) { textEl.innerText = dialogs[i++]; }
        else { clearInterval(interval); box.style.display = 'none'; isTalking = false; runCutscene(); }
    }, 2500);
}

function runCutscene() {
    isCutscene = true;
    document.getElementById('mobile-ui').style.display = 'none';
    const cutInt = setInterval(() => {
        poppy.position.z -= 0.15;
        camera.position.lerp(new THREE.Vector3(poppy.position.x, 1.8, poppy.position.z + 6), 0.05);
        camera.lookAt(poppy.position);
        if(poppy.position.z < -85) {
            clearInterval(cutInt);
            const lScreen = document.getElementById('loading-screen');
            lScreen.style.display = 'flex';
            setTimeout(() => {
                lScreen.style.display = 'none';
                buildLevel2();
                camera.position.set(0, 1.8, 20);
                isCutscene = false;
                if(platform === 'Mobile') document.getElementById('mobile-ui').style.display = 'block';
                document.getElementById('game-msg').innerText = "MISSION: AKTIVIERE DIE MASCHINE";
            }, 5000);
        }
    }, 20);
}

window.shoot = (side) => {
    if(isTalking || isCutscene || !active) return;
    const h = side === 'blue' ? hB : hR; h.position.z = -15;
    raycaster.set(camera.position, new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion));
    const hits = raycaster.intersectObjects(scene.children, true);
    
    if(hits.length > 0) {
        if(currentLevel === 1 && hits[0].object === scanner && side === 'blue') {
            scanner.material.color.set(0x00ff00); door.position.y = 10; poppy.visible = true; startTalk();
        }
        if(currentLevel === 2 && side === 'red') {
            const target = hits[0].point;
            const movePoppy = setInterval(() => {
                const dir = new THREE.Vector3().subVectors(target, poppy.position).normalize();
                poppy.position.add(new THREE.Vector3(dir.x, 0, dir.z).multiplyScalar(0.2));
                poppy.lookAt(target.x, 0.3, target.z);
                if(poppy.position.distanceTo(new THREE.Vector3(target.x, 0.3, target.z)) < 0.5) clearInterval(movePoppy);
            }, 20);
        }
    }
    setTimeout(() => h.position.z = -1, 400);
};

// INPUTS
const initJoy = (id, knobId, cb) => {
    const z = document.getElementById(id), k = document.getElementById(knobId);
    z.onpointermove = (e) => { if(isCutscene) return; const r = z.getBoundingClientRect(), x = (e.clientX-r.left-55)/55, y = (e.clientY-r.top-55)/55; k.style.transform = `translate(${x*25}px,${y*25}px)`; cb(x,y); };
    z.onpointerup = () => { k.style.transform = 'translate(0,0)'; cb(0,0); };
};
initJoy('joy-move', 'knob-move', (x,y) => moveInp = {x,y}); initJoy('joy-look', 'knob-look', (x,y) => lookInp = {x,y});
let keys = {}; window.onkeydown = (e) => keys[e.code] = true; window.onkeyup = (e) => keys[e.code] = false;

function loop() {
    requestAnimationFrame(loop); if(!active) return;
    if(!isCutscene) {
        if(platform === 'Mobile') { rot.lon += lookInp.x * 3.5; rot.lat -= lookInp.y * 3.0; }
        else { window.onmousemove = (e) => { if(document.pointerLockElement) { rot.lon += e.movementX*0.15; rot.lat -= e.movementY*0.15; }}; }
        rot.lat = Math.max(-85, Math.min(85, rot.lat));
        camera.lookAt(new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90-rot.lat), THREE.MathUtils.degToRad(rot.lon)).add(camera.position));
        const old = camera.position.clone();
        if(keys['KeyW']) camera.translateZ(-0.2); if(keys['KeyS']) camera.translateZ(0.2);
        if(platform === 'Mobile') { camera.translateZ(moveInp.y*0.2); camera.translateX(moveInp.x*0.2); }
        camera.position.y = 1.8;
        if(colliders.some(c => new THREE.Box3().setFromCenterAndSize(camera.position, new THREE.Vector3(1,2,1)).intersectsBox(c))) camera.position.copy(old);
    }
    renderer.render(scene, camera);
}
loop();
