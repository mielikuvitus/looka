Ок, ќе го направиме многу покомпактно и чисто како **engineering spec без емоции**, спремно за dev тим.

Ќе го структурирам како што се користи во production документација.

---

# 🧾 Bee GLB – Compact Technical Spec (v1)

## 📦 Asset

```text
bee.glb
Unity 6 (UnityGLTF export)
Web: Three.js / WebXR
```

---

## 🧠 Scene Graph

```text
Bee (Root)
├── Armature (Mixamo skeleton)
├── Body Mesh
├── Face Mesh (Morph Targets)
├── LeftWing (Transform animated mesh)
├── RightWing (Transform animated mesh)
└── Animator (Unity only, not runtime)
```

---

## 🎞️ Animations

Available clips:

```text
1. SitLeftRightLook
2. TalkiTwoHand
3. WingsAnimation
```

### Playback

```text
playbackSpeed = 1
```

---

## 🎬 Animation Descriptions

### 1. SitLeftRightLook

* idle state
* slight head movement
* base breathing motion
* default state

Use:

```js
Idle / waiting state
```

---

### 2. TalkiTwoHand

* speaking animation
* two-hand gestures
* head movement synced with speech

Use:

```js
AI speaking / voice active state
```

---

### 3. WingsAnimation

* loop animation
* wing flap motion
* independent from body animation

Use:

```js
hover / fly state
```

---

## 🎭 Morph Targets (Face)

Mesh: `polySurface9`

### Blend Shapes:

```text
Bee_Blink.polySurface20
Bee_Oo.polySurface21
Bee_Wide.polySurface22
Bee_Open.polySurface23
```

---

## 🎯 Morph Target Behavior

### Bee_Blink.polySurface20

* eye blink
* value: 0 → 1 → 0
* used for natural blinking loop

---

### Bee_Oo.polySurface21

* “O” mouth shape
* speech phoneme

---

### Bee_Wide.polySurface22

* wide/surprised expression
* emotional emphasis

---

### Bee_Open.polySurface23

* base mouth open
* neutral speech movement

---

## ⚙️ Runtime Control (Three.js)

### Animation Mixer Setup

```js
const mixer = new THREE.AnimationMixer(gltf.scene);
const actions = {};

gltf.animations.forEach(clip => {
  actions[clip.name] = mixer.clipAction(clip);
});
```

---

## 🔁 State Mapping

```text
Idle:
  SitLeftRightLook
  + Blink loop (morph target)

Talk:
  TalkiTwoHand
  + mouth morph targets (Oo/Open)

Fly/Hover:
  WingsAnimation
```

---

## 🧩 Morph Control Example

```js
mesh.morphTargetInfluences[BLINK] = 1;
mesh.morphTargetInfluences[OPEN] = 1;
```

---

## ⚠️ Important Notes

* Animator Controller is Unity-only (ignored in runtime)
* Only Animation Clips + Morph Targets are used in Three.js
* Wings are NOT Mixamo-driven (custom transform animation)
* Blend shapes are required for speech realism

---

## 🚀 Intended Use

* Web AI assistant character
* WebXR interactive avatar
* Speech-driven animation system
* Lightweight real-time rendering (<1k tris)

---

# 📌 Next Step (important)

За да го направам документот 100% точен за девелоперите, ми треба уште една работа:

👉 screenshot од:

* Hierarchy (Bee root expanded)
* Animator window (states visible)

Тогаш ќе ти направам:

## v2 spec:

* exact node names
* exact animation → state mapping
* exact morph index mapping
* ready-to-copy Three.js controller class

Прати го и ќе го “заклучиме” како production-ready SDK spec.
