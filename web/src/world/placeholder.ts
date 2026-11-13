import { AmbientLight, DirectionalLight, IcosahedronGeometry, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import { PLANET, SKY, SUN } from './palette.ts'

// A stand-in for the world: one flat-shaded low-poly sphere turning slowly,
// so the three.js build path exists from the first release. The real world
// replaces this module whole. It is loaded only after the page has drawn, so
// the still and its words never wait on it.
export function mountPlaceholder(container: HTMLElement): () => void {
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true })
  } catch (error) {
    // No WebGL here: the still and the signs are already on the page.
    console.warn('WebGL is unavailable, so the page stays as it is.', error)
    return () => {}
  }
  const scene = new Scene()
  const camera = new PerspectiveCamera(40, 1, 0.1, 100)
  camera.position.set(0, 0, 4)
  const planet = new Mesh(new IcosahedronGeometry(1.2, 2), new MeshStandardMaterial({ color: PLANET, flatShading: true }))
  const sun = new DirectionalLight(SUN, 2.5)
  sun.position.set(3, 2, 4)
  scene.add(planet, sun, new AmbientLight(SKY, 0.8))

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = container
    renderer.setSize(width, height, false)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    camera.aspect = width / Math.max(height, 1)
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(container)
  container.append(renderer.domElement)
  resize()
  renderer.setAnimationLoop((time: number) => {
    planet.rotation.y = time / 8000
    renderer.render(scene, camera)
  })
  container.dataset.ready = 'true'

  return () => {
    renderer.setAnimationLoop(null)
    observer.disconnect()
    renderer.dispose()
    renderer.domElement.remove()
  }
}
