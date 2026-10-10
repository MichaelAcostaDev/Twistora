import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CubeSolver } from './cube-solver.js';
import { parseToken } from './notation.js';
export const SPEED_MS = {
    fast: 100,
    normal: 200,
    slow: 400
};
export const THEME_BACKGROUND_COLORS = {
    dark: 0x111419,
    light: 0xf6f8fb
};
// Standard WCA Face Colors
const COLOR_WHITE = 0xf8fafc; // U (+Y)
const COLOR_YELLOW = 0xfacc15; // D (-Y)
const COLOR_GREEN = 0x16a34a; // F (+Z)
const COLOR_BLUE = 0x2563eb; // B (-Z)
const COLOR_RED = 0xdc2626; // R (+X)
const COLOR_ORANGE = 0xea580c; // L (-X)
const COLOR_INNER = 0x18181b; // Inner plastic core
export class VirtualCube {
    container;
    scene;
    camera;
    renderer = null;
    controls = null;
    cubies = [];
    initialTransforms = new Map();
    cubeSolver;
    isBusy = false;
    stopRequested = false;
    speed = 'normal';
    raycaster = new THREE.Raycaster();
    animFrameId = null;
    resizeObserver = null;
    pointerDragState = null;
    stateChangeListeners = [];
    constructor(container, cubeSolver = new CubeSolver()) {
        this.container = container;
        this.cubeSolver = cubeSolver;
        this.scene = new THREE.Scene();
        const w = this.container.clientWidth || 400;
        const h = this.container.clientHeight || 380;
        this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
        this.resetCamera();
        this.init();
    }
    getSolver() {
        return this.cubeSolver;
    }
    setSpeed(s) {
        this.speed = s;
    }
    isAnimating() {
        return this.isBusy;
    }
    onStateChange(cb) {
        this.stateChangeListeners.push(cb);
        cb(this.cubeSolver.isSolved());
        return () => {
            this.stateChangeListeners = this.stateChangeListeners.filter(l => l !== cb);
        };
    }
    notifyStateChange() {
        const solved = this.cubeSolver.isSolved();
        for (const l of this.stateChangeListeners) {
            l(solved);
        }
    }
    setThemeBackgroundColor(color) {
        this.scene.background = new THREE.Color(color);
        if (this.renderer) {
            this.renderer.setClearColor(color, 1);
        }
    }
    setThemeMode(mode) {
        this.setThemeBackgroundColor(THEME_BACKGROUND_COLORS[mode]);
    }
    syncThemeFromDocument() {
        const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        this.setThemeMode(currentTheme);
    }
    checkWebGL() {
        try {
            const c = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
        }
        catch {
            return false;
        }
    }
    init() {
        if (!this.checkWebGL()) {
            this.container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:2rem;color:var(--text-secondary)">
          <h3 style="margin-bottom:0.5rem;color:var(--text-primary)">WebGL Not Supported</h3>
          <p>Hardware accelerated 3D graphics are unavailable in this browser. The timer and statistics remain fully functional.</p>
        </div>
      `;
            return;
        }
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.scene.background = new THREE.Color(THEME_BACKGROUND_COLORS.dark);
        this.renderer.setClearColor(THEME_BACKGROUND_COLORS.dark, 1);
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);
        this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
        this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
        this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
        this.renderer.domElement.addEventListener('pointercancel', this.handlePointerCancel);
        // Orbit Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.minDistance = 4.5;
        this.controls.maxDistance = 14;
        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 1.4);
        this.scene.add(ambient);
        const dir1 = new THREE.DirectionalLight(0xffffff, 1.6);
        dir1.position.set(6, 9, 7);
        this.scene.add(dir1);
        const dir2 = new THREE.DirectionalLight(0xffffff, 0.9);
        dir2.position.set(-6, -8, -7);
        this.scene.add(dir2);
        // 26 Visible Cubies
        this.createCubies();
        // Resize Observer
        this.resizeObserver = new ResizeObserver(() => this.onResize());
        this.resizeObserver.observe(this.container);
        // Render loop
        this.renderLoop();
    }
    createCubies() {
        const geom = new THREE.BoxGeometry(0.94, 0.94, 0.94);
        const innerMat = new THREE.MeshStandardMaterial({ color: COLOR_INNER, roughness: 0.8, metalness: 0.1 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: COLOR_WHITE, roughness: 0.2, metalness: 0.05 });
        const yellowMat = new THREE.MeshStandardMaterial({ color: COLOR_YELLOW, roughness: 0.2, metalness: 0.05 });
        const greenMat = new THREE.MeshStandardMaterial({ color: COLOR_GREEN, roughness: 0.2, metalness: 0.05 });
        const blueMat = new THREE.MeshStandardMaterial({ color: COLOR_BLUE, roughness: 0.2, metalness: 0.05 });
        const redMat = new THREE.MeshStandardMaterial({ color: COLOR_RED, roughness: 0.2, metalness: 0.05 });
        const orangeMat = new THREE.MeshStandardMaterial({ color: COLOR_ORANGE, roughness: 0.2, metalness: 0.05 });
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    if (x === 0 && y === 0 && z === 0)
                        continue; // Skip core void
                    // BoxGeometry materials: [+X, -X, +Y, -Y, +Z, -Z]
                    const materials = [
                        x === 1 ? redMat : innerMat,
                        x === -1 ? orangeMat : innerMat,
                        y === 1 ? whiteMat : innerMat,
                        y === -1 ? yellowMat : innerMat,
                        z === 1 ? greenMat : innerMat,
                        z === -1 ? blueMat : innerMat
                    ];
                    const mesh = new THREE.Mesh(geom, materials);
                    mesh.position.set(x, y, z);
                    this.scene.add(mesh);
                    this.cubies.push(mesh);
                    this.initialTransforms.set(mesh, {
                        pos: mesh.position.clone(),
                        quat: mesh.quaternion.clone()
                    });
                }
            }
        }
    }
    getFaceSelection(hit) {
        const object = hit.object;
        const normal = new THREE.Vector3()
            .copy(hit.face?.normal ?? new THREE.Vector3(0, 1, 0))
            .transformDirection(object.matrixWorld)
            .round();
        if (Math.abs(normal.x) > Math.abs(normal.y) && Math.abs(normal.x) > Math.abs(normal.z)) {
            return {
                face: normal.x > 0 ? 'R' : 'L',
                axis: 'x',
                layer: Math.round(object.position.x)
            };
        }
        if (Math.abs(normal.y) > Math.abs(normal.z)) {
            return {
                face: normal.y > 0 ? 'U' : 'D',
                axis: 'y',
                layer: Math.round(object.position.y)
            };
        }
        return {
            face: normal.z > 0 ? 'F' : 'B',
            axis: 'z',
            layer: Math.round(object.position.z)
        };
    }
    resolveFaceGestureMove(face, dx, dy) {
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        if (absX < 12 && absY < 12)
            return null;
        switch (face) {
            case 'U':
                return dy < 0 ? 'U' : "U'";
            case 'D':
                return dy > 0 ? 'D' : "D'";
            case 'L':
                return dx > 0 ? 'L' : "L'";
            case 'R':
                return dx < 0 ? 'R' : "R'";
            case 'F':
                return dy < 0 ? 'F' : "F'";
            case 'B':
                return dy > 0 ? 'B' : "B'";
            default:
                return null;
        }
    }
    getPointerIntersection(event) {
        if (!this.renderer || !this.camera)
            return null;
        const rect = this.renderer.domElement.getBoundingClientRect();
        const pointer = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        this.raycaster.setFromCamera(pointer, this.camera);
        const hits = this.raycaster.intersectObjects(this.cubies, true);
        return hits.length > 0 ? hits[0] : null;
    }
    handlePointerDown = (event) => {
        if (event.button !== 0 || this.isBusy)
            return;
        const hit = this.getPointerIntersection(event);
        if (!hit)
            return;
        const selection = this.getFaceSelection(hit);
        if (!selection)
            return;
        event.preventDefault();
        this.pointerDragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            selectedFace: selection.face,
            axis: selection.axis,
            layer: selection.layer
        };
        if (this.controls) {
            this.controls.enableRotate = false;
        }
        if (this.renderer) {
            this.renderer.domElement.setPointerCapture(event.pointerId);
        }
    };
    handlePointerMove = (event) => {
        if (!this.pointerDragState || event.pointerId !== this.pointerDragState.pointerId)
            return;
        const dx = event.clientX - this.pointerDragState.startX;
        const dy = event.clientY - this.pointerDragState.startY;
        if (Math.abs(dx) + Math.abs(dy) > 12) {
            if (this.controls) {
                this.controls.enableRotate = false;
            }
        }
    };
    handlePointerUp = (event) => {
        if (!this.pointerDragState || event.pointerId !== this.pointerDragState.pointerId) {
            return;
        }
        const dx = event.clientX - this.pointerDragState.startX;
        const dy = event.clientY - this.pointerDragState.startY;
        const move = this.resolveFaceGestureMove(this.pointerDragState.selectedFace, dx, dy);
        this.pointerDragState = null;
        if (this.controls) {
            this.controls.enableRotate = true;
        }
        if (move && !this.isBusy) {
            void this.executeMove(move);
        }
    };
    handlePointerCancel = (event) => {
        if (this.pointerDragState && event.pointerId === this.pointerDragState.pointerId) {
            this.pointerDragState = null;
            if (this.controls) {
                this.controls.enableRotate = true;
            }
        }
    };
    resetCamera() {
        this.camera.position.set(4.3, 4.0, 5.2);
        this.camera.lookAt(0, 0, 0);
        if (this.controls) {
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }
    }
    resetSolved() {
        this.stopRequested = true;
        for (const mesh of this.cubies) {
            const init = this.initialTransforms.get(mesh);
            if (init) {
                mesh.position.copy(init.pos);
                mesh.quaternion.copy(init.quat);
                mesh.updateMatrix();
                mesh.updateMatrixWorld(true);
            }
        }
        this.cubeSolver.reset();
        this.isBusy = false;
        this.stopRequested = false;
        this.notifyStateChange();
    }
    async executeMove(token) {
        const info = parseToken(token);
        if (!info)
            return false;
        return new Promise(resolve => {
            this.animateSlice(info, () => {
                this.cubeSolver.move(token);
                this.notifyStateChange();
                resolve(true);
            });
        });
    }
    async executeSequence(seq, onStep) {
        const tokens = seq.trim().split(/\s+/).filter(t => t.length > 0);
        if (tokens.length === 0)
            return true;
        this.isBusy = true;
        this.stopRequested = false;
        for (let i = 0; i < tokens.length; i++) {
            if (this.stopRequested)
                break;
            const t = tokens[i];
            if (onStep) {
                onStep(i + 1, tokens.length, t);
            }
            await this.executeMove(t);
        }
        this.isBusy = false;
        this.stopRequested = false;
        return true;
    }
    stopSequence() {
        if (this.isBusy) {
            this.stopRequested = true;
        }
    }
    animateSlice(info, onDone) {
        const { axis, layer, angle } = info;
        const duration = SPEED_MS[this.speed];
        // Find the 9 (or 8 for middle layer) cubies in the target slice
        const sliceCubies = this.cubies.filter(c => Math.round(c.position[axis]) === layer);
        const pivot = new THREE.Group();
        this.scene.add(pivot);
        for (const c of sliceCubies) {
            pivot.attach(c);
        }
        const start = performance.now();
        const frame = (now) => {
            const elapsed = now - start;
            const progress = Math.min(1, elapsed / duration);
            // Smooth ease-in-out
            const eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
            pivot.rotation[axis] = angle * eased;
            if (progress < 1) {
                requestAnimationFrame(frame);
            }
            else {
                pivot.rotation[axis] = angle;
                pivot.updateMatrixWorld(true);
                for (const c of sliceCubies) {
                    this.scene.attach(c);
                    // Snap coordinates to clean integers {-1, 0, 1}
                    c.position.x = Math.round(c.position.x);
                    c.position.y = Math.round(c.position.y);
                    c.position.z = Math.round(c.position.z);
                    // Snap rotation to clean 90-degree multiples
                    c.rotation.x = Math.round(c.rotation.x / (Math.PI / 2)) * (Math.PI / 2);
                    c.rotation.y = Math.round(c.rotation.y / (Math.PI / 2)) * (Math.PI / 2);
                    c.rotation.z = Math.round(c.rotation.z / (Math.PI / 2)) * (Math.PI / 2);
                    c.updateMatrix();
                    c.updateMatrixWorld(true);
                }
                this.scene.remove(pivot);
                onDone();
            }
        };
        requestAnimationFrame(frame);
    }
    onResize() {
        if (!this.renderer)
            return;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        if (w === 0 || h === 0)
            return;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }
    renderLoop = () => {
        this.animFrameId = requestAnimationFrame(this.renderLoop);
        if (this.controls) {
            this.controls.update();
        }
        if (this.renderer) {
            this.renderer.render(this.scene, this.camera);
        }
    };
    destroy() {
        if (this.animFrameId !== null)
            cancelAnimationFrame(this.animFrameId);
        if (this.resizeObserver)
            this.resizeObserver.disconnect();
        if (this.renderer) {
            this.container.removeChild(this.renderer.domElement);
            this.renderer.dispose();
        }
    }
}
