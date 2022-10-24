import './App.css'
import {Canvas, extend, useFrame, useThree} from "@react-three/fiber";
import {OrbitControls, shaderMaterial, Sphere} from "@react-three/drei";
import fragment from "./shaders/fragment.glsl?raw";
import vertex from "./shaders/vertex.glsl?raw";
import * as THREE from "three";
import {AdditiveBlending, Mesh, PerspectiveCamera, SphereGeometry, Vector2, Vector3} from "three";
import {MutableRefObject, useMemo, useRef} from "react";
import {useControls} from "leva";

const ColorMaterial = shaderMaterial(
    {
        uTime: 0,
        uSize: 1.0,
        uInnerLimit: 0.35,
        uCursor: new THREE.Vector2(),
    },
    // the tag is optional, it allows the VSC to syntax highlibht and lint glsl,
    // also allows imports and other things
    vertex,
    fragment
)
extend({ColorMaterial})

const initialParams = {
    count: 200000,
    radius: 6,
    branches: 8,
    randomness: 0.3,
    randomnessPower: 4,
    insideColor: '#ff916f',
    outsideColor: '#375ab2',
}

function useShaderControls() {
    const controls = useControls({
        uSize: {
            value: 25,
            min: 1,
            max: 30,
            step: 1,
        },
        uInnerLimit: {
            value: 0.35,
            min: 0.0,
            max: 1,
            step: 0.05,
        },
        speed: {
            value: 0.2,
            min: 0.1,
            max: 2,
            step: 0.1,
        }
    })

    return {
        ...controls,
        ...initialParams,
    }
}

interface Param {
    size: number;
    insideColor: string;
    outsideColor: string;
    count: number;
    randomnessPower: number;
    randomness: number;
    radius: number;
    branches: number
}

function Galaxy() {
    const {gl, viewport, size} = useThree()

    const vec = new THREE.Vector3(); // create once and reuse
    const vec2 = new THREE.Vector2(); // create once and reuse
    const ref = useRef<THREE.Mesh>();
    const holeRef = useRef<THREE.Mesh>();
    const parameters = useShaderControls();
    const [colors, sizes, scales, randomness] = useMemo(() => {
        const positions = new Float32Array(parameters.count * 3)
        const colors = new Float32Array(parameters.count * 3)
        const scales = new Float32Array(parameters.count * 1)
        const randomness = new Float32Array(parameters.count * 3)

        const insideColor = new THREE.Color(parameters.insideColor)
        const outsideColor = new THREE.Color(parameters.outsideColor)

        for (let i = 0; i < parameters.count; i++) {
            const i3 = i * 3

            // Position
            const radius = Math.random() * parameters.radius

            const branchAngle = (i % parameters.branches) / parameters.branches * Math.PI * 2

            const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius
            const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius
            const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius

            positions[i3] = Math.cos(branchAngle) * radius
            positions[i3 + 1] = 0
            positions[i3 + 2] = Math.sin(branchAngle) * radius

            randomness[i3] = randomX
            randomness[i3 + 1] = randomY
            randomness[i3 + 2] = randomZ

            // Color
            const mixedColor = insideColor.clone()
            mixedColor.lerp(outsideColor, radius / parameters.radius)

            colors[i3] = mixedColor.r
            colors[i3 + 1] = mixedColor.g
            colors[i3 + 2] = mixedColor.b

            // Scale
            scales[i] = 1.2 * Math.random()
        }
        return [colors, positions, scales, randomness]
    }, [parameters])

    console.log(viewport)


    useFrame(({mouse, camera}, delta) => {
        if (!ref.current) return

        // ts-ignore
        ref.current.material.uniforms.uTime.value += parameters.speed * delta


        if (!holeRef.current) return
        updatePlanXZPosition(vec, mouse, camera);
        holeRef.current.position.lerp(vec, 0.1)
        vec2.set(holeRef.current.position.x, holeRef.current.position.z)
        // vec2.set(0.5,0.5)
        ref.current.material.uniforms.uCursor.value = vec2
    })


    return <>
        <points ref={ref} visible>
            <bufferGeometry attach="geometry">
                <bufferAttribute attach={"attributes-position"} count={sizes.length / 3} array={sizes} itemSize={3}/>
                <bufferAttribute attach={"attributes-color"} count={colors.length / 3} array={colors} itemSize={3}/>
                <bufferAttribute attach={"attributes-aScale"} count={scales.length} array={scales} itemSize={1}/>
                <bufferAttribute attach={"attributes-aRandomness"} count={randomness.length / 3} array={randomness}
                                 itemSize={3}/>
            </bufferGeometry>
            <colorMaterial
                depthWrite={false}
                vertexColors={true}
                blending={AdditiveBlending}
                uTime={0.8}
                uInnerLimit={parameters.uInnerLimit}
                uSize={parameters.uSize}
                key={ColorMaterial.key}
            />
        </points>
        <BlackHoleCursor innerRef={holeRef}/>
    </>
}

function BlackHoleCursor({innerRef}: { innerRef: MutableRefObject<Mesh | undefined> }) {

    // useFrame(({mouse, camera}) => {
    //     if (!ref.current) return
    //     updatePlanXZPosition(vec, mouse, camera);
    //     ref.current.position.set(vec.x, 0, vec.z)
    // })
    //

    return <Sphere ref={innerRef} args={[0.15, 20, 20]} position={innerRef?.current?.position}>
        <meshBasicMaterial attach="material" color="black"/>
    </Sphere>;
}


function BlackHole() {
    return <Sphere args={[0.25, 20, 20]}>
        <meshBasicMaterial attach="material" color="black"/>
    </Sphere>;
}

// https://stackoverflow.com/questions/13055214/mouse-canvas-x-y-to-three-js-world-x-y-z
function updatePlanXZPosition(vec: Vector3, mouse: Vector2, camera: PerspectiveCamera) {
    vec.set(
        mouse.x,
        mouse.y,
        0.0);

    vec.unproject(camera);
    vec.sub(camera.position).normalize();
    const distance = -camera.position.y / vec.y;
    vec.multiplyScalar(distance).add(camera.position);
    vec.setY(0);
}

function App() {
    return (
        <>
            <Canvas camera={{position: [0, 3, 0], fov: 75, near: 0.1, far: 100}}>
                <OrbitControls/>

                {/*<BlackHole/>*/}
                {/*<BlackHoleCursor/>*/}
                <Galaxy/>
                <axesHelper args={[1]}/>

            </Canvas>
            <ul className="credits">
                <li>🧛 By <a href="https://twitter.com/Wahlstra">@Wahlstra</a> with ThreeJS (R3F). Source <a
                    href="https://github.com/magnuswahlstrand/demo-r3f-dissolve-shader">here</a></li>
                <li>🧊 Inspiration by Bruno Simon's <a href="https://threejs-journey.com/">excellent course on Three
                    JS</a></li>
                <li>🐻‍❄️ Gopher by <a href="http://reneefrench.blogspot.com/">Renee French</a>.</li>
            </ul>
        </>
    )
}

export default App
