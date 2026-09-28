/** Visor 3D base (Three.js): cámaras, luces PBR, sombras, OrbitControls y modos de vista. */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type ViewMode = 'perspective' | 'orthographic' | 'section' | 'wireframe';

export class SceneViewer {
  container: HTMLElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  perspCamera: THREE.PerspectiveCamera;
  orthoCamera: THREE.OrthographicCamera;
  active: THREE.Camera;
  controls: OrbitControls;
  clipPlane: THREE.Plane;
  modelGroup: THREE.Group | null = null;
  viewMode: ViewMode = 'perspective';
  onFrame?: (dt: number, t: number) => void;
  private raf = 0;
  private clock = new THREE.Clock();
  private ro: ResizeObserver;

  constructor(container: HTMLElement) {
    this.container = container;
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 500;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#080b11');

    this.perspCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 5000);
    this.perspCamera.position.set(90, 70, 120);

    const aspect = w / h;
    const fs = 90;
    this.orthoCamera = new THREE.OrthographicCamera(-fs * aspect, fs * aspect, fs, -fs, -2000, 2000);
    this.orthoCamera.position.set(90, 70, 120);

    this.active = this.perspCamera;

    this.controls = new OrbitControls(this.perspCamera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 20, 0);

    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

    this.setupLights();
    this.setupGround();

    this.ro = new ResizeObserver(() => this.onResize());
    this.ro.observe(container);

    this.animate();
  }

  private setupLights() {
    this.scene.add(new THREE.AmbientLight(0x415066, 0.6));
    const hemi = new THREE.HemisphereLight(0x9fc6ff, 0x14181f, 0.7);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(80, 140, 90);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 600;
    const d = 160;
    key.shadow.camera.left = -d;
    key.shadow.camera.right = d;
    key.shadow.camera.top = d;
    key.shadow.camera.bottom = -d;
    key.shadow.bias = -0.0004;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x39e1c6, 0.5);
    fill.position.set(-90, 40, -60);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffb454, 0.35);
    rim.position.set(0, 30, -120);
    this.scene.add(rim);
  }

  private setupGround() {
    const grid = new THREE.GridHelper(600, 60, 0x2a6c8f, 0x141b24);
    (grid.material as THREE.Material).opacity = 0.35;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = -0.01;
    this.scene.add(grid);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.ShadowMaterial({ opacity: 0.35 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  setModel(group: THREE.Group) {
    if (this.modelGroup) {
      this.scene.remove(this.modelGroup);
      this.disposeGroup(this.modelGroup);
    }
    this.modelGroup = group;
    this.scene.add(group);
    this.applyViewMode();
  }

  setViewMode(mode: ViewMode) {
    this.viewMode = mode;
    if (mode === 'orthographic') this.active = this.orthoCamera;
    else this.active = this.perspCamera;
    this.controls.object = this.active as any;
    this.controls.update();
    this.applyViewMode();
  }

  private applyViewMode() {
    const wire = this.viewMode === 'wireframe';
    const clip = this.viewMode === 'section';
    this.renderer.localClippingEnabled = clip;
    this.modelGroup?.traverse((o: any) => {
      if (o.isMesh && o.material) {
        const mats: THREE.Material[] = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m: any) => {
          m.wireframe = wire;
          m.clippingPlanes = clip ? [this.clipPlane] : [];
          m.side = clip ? THREE.DoubleSide : THREE.FrontSide;
          m.needsUpdate = true;
        });
      }
    });
  }

  frameCamera(radius: number, center: THREE.Vector3) {
    this.controls.target.copy(center);
    const dir = new THREE.Vector3(1.1, 0.85, 1.3).normalize();
    this.perspCamera.position.copy(center.clone().add(dir.multiplyScalar(radius * 2.4)));
    this.orthoCamera.position.copy(this.perspCamera.position);
    const aspect = this.container.clientWidth / this.container.clientHeight;
    const fs = radius * 1.4;
    this.orthoCamera.left = -fs * aspect;
    this.orthoCamera.right = fs * aspect;
    this.orthoCamera.top = fs;
    this.orthoCamera.bottom = -fs;
    this.orthoCamera.updateProjectionMatrix();
    this.controls.update();
  }

  resetView() {
    this.setViewMode('perspective');
  }

  private onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.perspCamera.aspect = w / h;
    this.perspCamera.updateProjectionMatrix();
    const aspect = w / h;
    const fs = this.orthoCamera.top;
    this.orthoCamera.left = -fs * aspect;
    this.orthoCamera.right = fs * aspect;
    this.orthoCamera.updateProjectionMatrix();
  }

  private animate = () => {
    this.raf = requestAnimationFrame(this.animate);
    const dt = this.clock.getDelta();
    const t = this.clock.elapsedTime;
    if (this.onFrame) this.onFrame(dt, t);
    this.controls.update();
    this.renderer.render(this.scene, this.active);
  };

  private disposeGroup(group: THREE.Object3D) {
    group.traverse((o: any) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m: any) => m.dispose && m.dispose());
      }
    });
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    if (this.modelGroup) this.disposeGroup(this.modelGroup);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

/** Rampa de color esfuerzo/térmica: azul (frío) → cian → verde → amarillo → rojo (caliente). */
export function heatColor(t: number): THREE.Color {
  const c = new THREE.Color();
  const x = Math.max(0, Math.min(1, t));
  c.setHSL((1 - x) * 0.66, 0.85, 0.35 + 0.2 * x);
  return c;
}
