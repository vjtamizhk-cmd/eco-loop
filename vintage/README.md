# 🏫 Vintage School Pen Fight 3D (The Nostalgic Classroom Game)

A fully functional, nostalgic 3D **Pen Fight** game built with **Three.js**, custom rigid-body cylinder collision & angular spin physics, procedural vintage classroom desk textures, authentic pen models, and intuitive controls.

---

## 🌟 Key Features

### 1. 3D Nostalgic Classroom Atmosphere
- **Authentic Wooden Bench**: Procedural wood grain, carved hearts & compass rosettes ("Amit + Priya", "ROCKZ"), ink blots, pen scribbles, beveled edges, and tubular iron frame legs.
- **Classroom Environment**: Green chalkboard with physics collision formulas ($E=mc^2, p=mv$), chalk duster, sunlight streaming from classroom window, and rotating vintage 3-blade ceiling fan.
- **Vintage Classroom Desk Props**:
  - Camlin / Natraj Tin Geometry Box
  - Natraj 621 Red/White Eraser
  - 30cm Wooden Ruler with millimeter marks
  - School Notebook with red margin & blue ruled lines

### 2. Iconic Vintage Pen Roster & 3D Models
- **Reynolds 045 Fine Carbure**: The legendary white hexagonal pen with colored cap & plug. High-speed spin whip!
- **Cello Gripper**: Translucent body with ergonomic rubber grip rings. High traction & stability.
- **Parker Vector**: Brushed stainless steel juggernaut with signature arrow clip. Devastating knockout mass!
- **Pilot Hi-Tecpoint V5**: Stepped needle cone tip with liquid ink window. Laser straight accuracy!
- **Hero 329 Vintage Fountain Pen**: Hooded gold-plated nib, burgundy resin body, and steel cap.
- **Natraj 621 Pencil**: Red & black striped hexagonal pencil with pink rubber ferrule. Ultra-light spin cyclone!

### 3. Realistic 3D Pen Fight Physics
- **Off-Center Spin Whip vs Bullet Drive**:
  - Hitting the **Tail** generates maximum angular momentum ($\omega = \frac{r \times F}{I}$) for the classic "Helicopter Spin".
  - Hitting the **Center of Mass** produces a straight linear push ("Bullet Drive").
  - Hitting the **Tip** generates a curved hook deflection.
- **Cap Balancing**: Posting the cap on the rear shifts center of mass backward for aggressive spin whip, while cap on front increases nose weight.
- **Desk Edge Gravity Tipping**: If a pen hangs more than ~50% over the wooden bench edge, gravity tips it off and it tumbles down to the classroom floor with a heavy thud!

### 4. Simple & Complete Playing Controls
- **On-Screen Button Controls (Super easy & responsive)**:
  - Aim Fine/Coarse Buttons: `[◀◀ -15°]` `[◀ -2°]` `[Angle Slider]` `[+2° ▶]` `[+15° ▶▶]`
  - Auto-Aim: `[🎯 Lock]` onto opponent pen instantly.
  - Spin Point Selector: `[🌪️ Tail (Spin)]`, `[🚀 Body (Drive)]`, `[🎯 Tip (Hook)]`.
  - Power Meter: Quick presets `[Tap (30%)]`, `[Med (65%)]`, `[SMASH (100%)]` and interactive slider.
  - Big Primary Button: **`[💥 FLICK PEN 🚀]`**
  - Trick Shortcuts: `[🌀 Helicopter Spin]`, `[🛡️ Safety Bunt]`, `[⚡ Rocket Knockout]`
- **Touch / Mouse Direct Sling**: Click/touch and drag back from the pen to pull a dynamic 3D trajectory line and release to flick!
- **Multi-Camera Modes**: `[🎥 Bench View]`, `[📐 Top-Down Radar]`, `[🔍 Pen Cam]`.
- **Keyboard Shortcuts**: `Space`/`Enter` to Flick, `Left`/`Right` to Aim, `Up`/`Down` for Power, `1`/`2`/`3` for Camera views, `T` to toggle Spin Hitpoint.

### 5. Game Modes
1. **Quick Match (vs AI)**: 3 smart difficulty settings (*Backbencher*, *Class Topper*, *School Champion*).
2. **2-Player Pass & Play**: Turn-based local multiplayer on the same screen.
3. **Classroom Championship (Tournament)**: Progress through 4 nostalgic school stages (Room 4B, Study Hall, Central Library, Final Exam Hall).
4. **Trick Shot Challenges**: 5 skill puzzles (Bullseye Stop, Ruler Bank Shot, Geometry Box Bypass, Eraser Clean Sweep, Double Knockout).
5. **3D Pen Locker & Customizer**: Interactive 3D turntable, stat radar bars, cap weight configuration, and color swatches.

### 6. Procedural Sound Engine (Web Audio API)
- High-impact plastic & wood collision clacks.
- Dynamic flick whoosh based on power.
- Pen floor drop thud.
- Nostalgic double brass school bell chime and victory fanfare.

---

## 🚀 How to Run

### Development Mode:
```bash
npm run dev
```

### Production Build:
```bash
npm run build
npm run preview
```
