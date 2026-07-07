// =========================================================
// MovieDex — 3D Pokéball hero (three.js)
// Idle spin + bob, wobbles like a "catch" on every scan.
//
// Loaded as a CLASSIC script (not an ES module) so it also works
// when the page is opened directly via file:// — where browsers
// block module scripts. `THREE` comes from the global UMD build
// loaded in index.html.
// =========================================================
(function () {
  const THREE = window.THREE;
  const orb = document.getElementById("orb");
  const canvas = document.getElementById("pokeball-canvas");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Bail gracefully to the CSS fallback if anything is missing.
  if (!orb || !canvas || !window.WebGLRenderingContext || !THREE) return;
  try {
    initPokeball();
  } catch (err) {
    console.warn("Pokéball 3D unavailable, using fallback.", err);
  }

function initPokeball() {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 7.4);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // ---- Build the ball from primitives ----
  const ball = new THREE.Group();
  const R = 2;

  const shell = (color, thetaStart, thetaLength) =>
    new THREE.Mesh(
      new THREE.SphereGeometry(R, 64, 48, 0, Math.PI * 2, thetaStart, thetaLength),
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.28,
        metalness: 0.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.18,
      })
    );

  // top red hemisphere + bottom white hemisphere
  ball.add(shell(0xee1515, 0, Math.PI / 2));
  ball.add(shell(0xf5f5f7, Math.PI / 2, Math.PI / 2));

  // black equatorial band
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 1.005, R * 1.005, R * 0.14, 64, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x12131f, roughness: 0.5, side: THREE.DoubleSide })
  );
  ball.add(band);

  // center button: black ring + white cap on the front (+z)
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(R * 0.32, R * 0.075, 24, 48),
    new THREE.MeshStandardMaterial({ color: 0x12131f, roughness: 0.45 })
  );
  ring.position.z = R * 0.96;
  ball.add(ring);

  const button = new THREE.Mesh(
    new THREE.CircleGeometry(R * 0.3, 48),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    })
  );
  button.position.z = R * 0.99;
  ball.add(button);

  // Slight friendly tilt
  ball.rotation.set(0.32, -0.5, 0.1);
  scene.add(ball);

  // ---- Lighting: bright toy-plastic look ----
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 6, 6);
  scene.add(key);

  const rimBlue = new THREE.PointLight(0x2a75bb, 60, 40);
  rimBlue.position.set(-6, -2, 4);
  scene.add(rimBlue);

  const rimYellow = new THREE.PointLight(0xffcb05, 30, 40);
  rimYellow.position.set(5, -5, -2);
  scene.add(rimYellow);

  // ---- Sizing ----
  function resize() {
    const size = orb.clientWidth;
    if (!size) return;
    renderer.setSize(size, size, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(orb);

  orb.classList.add("is-live");

  // ---- Subtle pointer parallax ----
  const target = { x: 0.32, y: -0.5 };
  if (!reduceMotion) {
    orb.addEventListener("pointermove", (e) => {
      const r = orb.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      target.x = 0.32 + ny * 0.5;
      target.y = -0.5 + nx * 0.8;
    });
    orb.addEventListener("pointerleave", () => {
      target.x = 0.32;
      target.y = -0.5;
    });
  }

  // ---- Catch wobble on scan (GSAP if available) ----
  let wobbling = false;
  function wobble() {
    if (reduceMotion || wobbling || !window.gsap) return;
    wobbling = true;
    const gsap = window.gsap;
    gsap
      .timeline({ onComplete: () => (wobbling = false) })
      .to(ball.rotation, { z: 0.55, duration: 0.16, ease: "power2.out" })
      .to(ball.rotation, { z: -0.45, duration: 0.24, ease: "power1.inOut" })
      .to(ball.rotation, { z: 0.3, duration: 0.22, ease: "power1.inOut" })
      .to(ball.rotation, { z: 0.1, duration: 0.3, ease: "elastic.out(1, 0.4)" })
      .to(ball.position, { y: -0.25, duration: 0.14, ease: "power2.out" }, 0)
      .to(ball.position, { y: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" }, 0.14);
  }
  window.addEventListener("moviedex:catch", wobble);

  // ---- Render loop ----
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    if (!reduceMotion && !wobbling) {
      ball.rotation.y += (target.y - ball.rotation.y) * 0.05 + 0.004;
      ball.rotation.x += (target.x - ball.rotation.x) * 0.05;
      ball.position.y = Math.sin(t * 1.4) * 0.08;
    }
    renderer.render(scene, camera);
  }
  animate();
  }
})();
