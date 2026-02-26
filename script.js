import * as THREE from 'three';

let active = false, platform = 'PC';
let moveInp = { x: 0, y: 0 }, lookInp = { x: 0, y: 0 };
let rot = { lat: 0, lon: -90 };
const colliders = [];
const raycaster = new THREE.Raycaster();

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.1);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- TASCHENLAMPE ---
const flash = new THREE.SpotLight(0xffffff, 250, 70, 0.6, 0.5);
camera.add(flash);
flash.position.set(0,0,0.2);
flash.target.position.set(0,0,-1);
camera.add(flash.target);
scene.add(camera);
scene.add(new THREE.AmbientLight(0x404040, 0.8));

// --- WELT ---
const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(100,200), new THREE.MeshStandardMaterial({color: 0x0a0a0a}));
floor.rotation.x = -Math.PI/2;
scene.add(floor);

const createWall = (w,h,d, x,y,z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat);
    m.position.set(x,y,z);
    scene.add(m);
    colliders.push(new THREE.Box3().setFromObject(m));
};
createWall(1, 8, 100, 7, 4, -40);
createWall(1, 8, 100, -7, 4, -40);
createWall(15, 8, 1, 0, 4, -90);

// --- HUGGY & OBJEKTE ---
const block = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 2.5), new THREE.MeshStandardMaterial({color: 0xffaa00}));
block.position.set(0, 1.25, -20);
scene.add(block);

const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({color: 0xff0000}));
screen.position.set(6.24, 1.8, -15);
screen.rotation.y = -Math.PI/2;
scene.add(screen);

const huggy = new THREE.Group();
const monsterMat = new THREE.MeshStandardMaterial({ color: 0x0000ff });
const body = new THREE.Mesh(new THREE.BoxGeometry(1, 2.5, 0.6), monsterMat);
huggy.add(body);
const head = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1, 1), monsterMat);
head.position.y = 1.7;
huggy.add(head);
huggy.position.set(0, 3, -60);
huggy.visible = false;
scene.add(huggy);

// --- GRABPACK ---
const hB = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.4,0.1), new THREE.MeshStandardMaterial({color: 0x0088ff}));
const hR = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.4,0.1), new THREE.MeshStandardMaterial({color: 0xff0000}));
camera.add(hB); camera.add(hR);
hB.position.set(-0.8,-0.6,-1.2); hR.position.set(0.8,-0.6,-1.2);

const geoB = new THREE.BufferGeometry();
const lineB = new THREE.Line(geoB, new THREE.LineBasicMaterial({color: 0x444444}));
scene.add(lineB);
const geoR = new THREE.BufferGeometry();
const lineR = new THREE.Line(geoR, new THREE.LineBasicMaterial({color: 0x444444}));
scene.add(lineR);

// --- FUNCTIONS ---
window.startGame = (p) => {
    platform = p; active = true;
    document.getElementById('menu-overlay').style.display = 'none';
    if(p === 'Mobile') document.getElementById('mobile-ui').style.display = 'block';
    else renderer.domElement.requestPointerLock();
};

window.shoot = (side) => {
    const hand = side === 'blue' ? hB : hR;
    const dir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
    hand.position.z = -15;
    raycaster.set(camera.position, dir);
    const hits = raycaster.intersectObjects(scene.children, true);
    if(hits.length > 0) {
        if(hits[0].object === block && side === 'red') block.position.add(dir.multiplyScalar(-4));
        if(hits[0].object === screen && side === 'blue') { 
            screen.material.color.set(0x00ff00); 
            huggy.visible = true; 
            document.getElementById('game-msg').innerText = "HUGGY KOMMT!";
        }
    }
    setTimeout(() => hand.position.z = -1.2, 400);
};

const initJoy = (id, knobId, cb) => {
    const z = document.getElementById(id), k = document.getElementById(knobId);
    z.onpointermove = (e) => {
        const r = z.getBoundingClientRect(), x = (e.clientX-r.left-65)/65, y = (e.clientY-r.top-65)/65;
        k.style.transform = `translate(${x*30}px,${y*30}px)`; cb(x,y);
    };
    z.onpointerup = () => { k.style.transform = 'translate(0,0)'; cb(0,0); };
};
initJoy('joy-move', 'knob-move', (x,y) => moveInp = {x,y});
initJoy('joy-look', 'knob-look', (x,y) => lookInp = {x,y});

let keys = {};
window.onkeydown = (e) => keys[e.code] = true;
window.onkeyup = (e) => keys[e.code] = false;

function update() {
    requestAnimationFrame(update);
    if(!active) return;

    if(platform === 'Mobile') {
        rot.lon += lookInp.x * 3.5;
        rot.lat -= lookInp.y * 3.0;
    } else {
        window.onmousemove = (e) => { if(document.pointerLockElement) { rot.lon += e.movementX*0.2; rot.lat -= e.movementY*0.2; }};
    }
    
    rot.lat = Math.max(-85, Math.min(85, rot.lat));
    const t = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90-rot.lat), THREE.MathUtils.degToRad(rot.lon)).add(camera.position);
    camera.lookAt(t);

    const old = camera.position.clone();
    if(keys['KeyW']) camera.translateZ(-0.2); if(keys['KeyS']) camera.translateZ(0.2);
    if(platform === 'Mobile') { camera.translateZ(moveInp.y*0.2); camera.translateX(moveInp.x*0.2); }
    camera.position.y = 1.8;

    const pBox = new THREE.Box3().setFromCenterAndSize(camera.position, new THREE.Vector3(1,2,1));
    if(colliders.some(c => pBox.intersectsBox(c))) camera.position.copy(old);

    // Kabel Update
    geoB.setFromPoints([camera.position.clone().add(new THREE.Vector3(-0.5,-0.5,0).applyQuaternion(camera.quaternion)), new THREE.Vector3().copy(hB.position).applyMatrix4(camera.matrixWorld)]);
    geoR.setFromPoints([camera.position.clone().add(new THREE.Vector3(0.5,-0.5,0).applyQuaternion(camera.quaternion)), new THREE.Vector3().copy(hR.position).applyMatrix4(camera.matrixWorld)]);

    if(huggy.visible) {
        huggy.position.add(new THREE.Vector3().subVectors(camera.position, huggy.position).normalize().multiplyScalar(0.08));
        if(huggy.position.distanceTo(camera.position) < 2.5) {
            active = false;
            document.getElementById('jumpscare').style.display = 'flex';
            setTimeout(() => location.reload(), 2000);
        }
    }
    renderer.render(scene, camera);
}
update();
