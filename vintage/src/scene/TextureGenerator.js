import * as THREE from 'three';

export class TextureGenerator {
  // Generate Vintage Wooden Desk Texture with realistic grain, scratches, compass carvings & ink blots
  static createDeskTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    // Base warm teak / oak classroom wood tones
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#8c532b');
    grad.addColorStop(0.3, '#754320');
    grad.addColorStop(0.7, '#643719');
    grad.addColorStop(1, '#7d4a25');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Wood Grain streaks
    for (let y = 0; y < canvas.height; y += 3) {
      const alpha = 0.05 + Math.sin(y * 0.04) * 0.03 + Math.random() * 0.04;
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(45, 20, 5, ${alpha})` : `rgba(165, 105, 55, ${alpha * 0.8})`;
      ctx.fillRect(0, y, canvas.width, 2 + Math.random() * 3);
    }

    // Wood fiber noise
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 18;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.8));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.6));
    }
    ctx.putImageData(imgData, 0, 0);

    // Vintage Wood Planks / Seams
    ctx.fillStyle = 'rgba(25, 10, 2, 0.45)';
    ctx.fillRect(canvas.width * 0.5 - 2, 0, 4, canvas.height);

    // Nostalgic School Desk Carvings (Compass engravings, scratched hearts, initials)
    ctx.strokeStyle = 'rgba(240, 210, 180, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Shadow underneath carved grooves
    ctx.shadowColor = 'rgba(20, 5, 0, 0.8)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1.5;
    ctx.shadowOffsetY = 1.5;

    // Carving 1: Heart with arrow "A + P" (Amit + Priya)
    this.drawCarvedHeart(ctx, 450, 420, 90, "A + P");

    // Carving 2: Compass geometric flower & circle patterns (every kid did this with compass!)
    this.drawCompassRosette(ctx, 1550, 500, 75);

    // Carving 3: "ROCKZ 2004" / "PEN FIGHT PRO"
    ctx.font = 'bold 36px "Courier New", monospace';
    ctx.strokeText("PEN FIGHT CHAMP 🏆", 820, 220);
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.strokeText("ROLL NO. 23", 300, 1550);
    ctx.strokeText("T + S = 4EVER", 1450, 1420);

    // Random compass puncture holes and scratch lines
    for (let i = 0; i < 40; i++) {
      const sx = 100 + Math.random() * (canvas.width - 200);
      const sy = 100 + Math.random() * (canvas.height - 200);
      const len = 30 + Math.random() * 80;
      const angle = Math.random() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len);
      ctx.stroke();

      // Compass puncture hole
      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.arc(sx, sy, 3 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(20, 5, 0, 0.9)';
        ctx.fill();
      }
    }

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Nostalgic Blue & Black Fountain Pen Ink Blots & Scribbles
    this.drawInkBlot(ctx, 600, 950, 40, '#0f2b5c');
    this.drawInkBlot(ctx, 1620, 880, 28, '#1b1b1b');
    this.drawInkBlot(ctx, 980, 1680, 32, '#143d75');

    // Pen testing scribbles in the corner
    this.drawPenScribble(ctx, 220, 350, '#1034a6');
    this.drawPenScribble(ctx, 1780, 1750, '#b22222');

    // Worn Desk Edges / Bevel shading
    const edgeGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    edgeGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
    edgeGrad.addColorStop(0.04, 'transparent');
    edgeGrad.addColorStop(0.96, 'transparent');
    edgeGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.generateMipmaps = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // Generate Chalkboard texture with dusty smudges and nostalgic classroom chalk notes
  static createChalkboardTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Vintage deep matte classroom green
    ctx.fillStyle = '#1c382b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Chalk dust & sponge erasure swirls
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = 80 + Math.random() * 250;
      const dustGrad = ctx.createRadialGradient(x, y, 10, x, y, r);
      dustGrad.addColorStop(0, `rgba(255, 255, 255, ${0.04 + Math.random() * 0.05})`);
      dustGrad.addColorStop(0.6, `rgba(220, 240, 230, ${0.02 + Math.random() * 0.03})`);
      dustGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = dustGrad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Chalk writing styles
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';

    // Header: PERIOD 5 - PHYSICS & MATH
    ctx.font = 'bold 42px "Caveat", "Comic Sans MS", cursive, sans-serif';
    ctx.fillText("CLASS X - B  |  DATE: 14/09/2004", 120, 90);
    ctx.fillText("TODAY'S TOPIC: LAWS OF MOTION & COLLISION", 120, 150);

    // Chalk line separator
    ctx.beginPath();
    ctx.moveTo(110, 175);
    ctx.lineTo(1900, 175);
    ctx.stroke();

    // Formulas
    ctx.font = '36px "Courier New", monospace';
    ctx.fillText("1. Momentum:  p = m · v", 130, 260);
    ctx.fillText("2. Elastic Collision:  m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂", 130, 330);
    ctx.fillText("3. Angular Momentum:  L = I · ω", 130, 400);
    ctx.fillText("4. Kinetic Energy:   E_k = ½ m v²", 130, 470);
    ctx.fillText("5. Torque:  τ = r × F", 130, 540);

    // Chalk doodles & diagrams on right side
    // Draw Coordinate / Vector collision diagram
    ctx.beginPath();
    ctx.moveTo(1300, 480);
    ctx.lineTo(1700, 480);
    ctx.lineTo(1680, 470);
    ctx.moveTo(1700, 480);
    ctx.lineTo(1680, 490);
    ctx.stroke();

    ctx.fillText("Pen 1 ➔ [ Impact ] ➔ Pen 2", 1220, 430);

    // Classroom notice
    ctx.fillStyle = '#ffea78';
    ctx.font = 'bold 34px "Comic Sans MS", cursive, sans-serif';
    ctx.fillText("⚡ CLASSROOM PEN FIGHT CHAMPIONSHIP ⚡", 1120, 260);
    ctx.font = '28px "Comic Sans MS", cursive, sans-serif';
    ctx.fillText("Rule 1: Last Pen on Bench Wins!", 1160, 315);
    ctx.fillText("Rule 2: Don't get caught by the Teacher!", 1160, 360);

    // Bottom Homework notice
    ctx.fillStyle = '#ff9999';
    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.fillText("HOMEWORK: Complete Exercise 5.1 Q1 to Q10 in Notebook", 130, 920);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // Camlin Geometry Box tin texture
  static createGeometryBoxTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Vintage royal blue & metallic tin casing
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#002a66');
    grad.addColorStop(0.5, '#0a4da6');
    grad.addColorStop(1, '#001a40');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Metallic Tin Bevel Border
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 12;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(26, 26, canvas.width - 52, canvas.height - 52);

    // Brand Name: CAMLIN SCHOLAR MATHEMATICAL DRAWING INSTRUMENTS
    ctx.fillStyle = '#ffdd55';
    ctx.font = 'bold 56px "Arial Black", Gadget, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("SCHOLAR", canvas.width / 2, 130);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px "Arial", sans-serif';
    ctx.fillText("MATHEMATICAL DRAWING INSTRUMENTS", canvas.width / 2, 180);

    // Geometric compass rosette graphic
    this.drawCompassRosette(ctx, canvas.width / 2, 320, 90, '#ffdd55');

    // Little details
    ctx.font = 'italic 20px "Times New Roman"';
    ctx.fillText("Precision Quality • Made for Students", canvas.width / 2, 460);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // Natraj 621 Red-White Eraser texture
  static createEraserTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Left half Red, right half White (Classic Natraj / Apsara eraser)
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(0, 0, canvas.width * 0.48, canvas.height);

    ctx.fillStyle = '#f5f5f0';
    ctx.fillRect(canvas.width * 0.48, 0, canvas.width * 0.52, canvas.height);

    // Text on red side
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("NATRAJ", canvas.width * 0.24, 110);
    ctx.font = 'bold 26px "Arial", sans-serif';
    ctx.fillText("621 ERASER", canvas.width * 0.24, 160);

    // Text on white side
    ctx.fillStyle = '#222222';
    ctx.font = 'bold 32px "Arial", sans-serif';
    ctx.fillText("DUST FREE", canvas.width * 0.74, 110);
    ctx.font = '18px "Arial", sans-serif';
    ctx.fillText("NON-TOXIC", canvas.width * 0.74, 155);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // 30cm Wooden Ruler Texture
  static createRulerTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Natural light pine / birch wood
    ctx.fillStyle = '#e8c99b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Wood fiber
    for (let x = 0; x < canvas.width; x += 2) {
      ctx.fillStyle = `rgba(180, 130, 80, ${0.05 + Math.random() * 0.1})`;
      ctx.fillRect(x, 0, 2, canvas.height);
    }

    // Centimeter & Millimeter marks on top edge
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 16px "Arial", sans-serif';
    ctx.textAlign = 'center';

    for (let cm = 0; cm <= 30; cm++) {
      const x = 30 + cm * 31;
      // CM line
      ctx.fillRect(x - 1, 0, 2, 32);
      ctx.fillText(`${cm}`, x, 48);

      // MM lines
      if (cm < 30) {
        for (let mm = 1; mm < 10; mm++) {
          const mx = x + mm * 3.1;
          const h = mm === 5 ? 22 : 14;
          ctx.fillRect(mx - 0.5, 0, 1, h);
        }
      }
    }

    // Inch marks on bottom edge
    for (let inch = 0; inch <= 12; inch++) {
      const x = 30 + inch * 78;
      ctx.fillRect(x - 1, canvas.height - 28, 2, 28);
      ctx.fillText(`${inch}"`, x, canvas.height - 34);

      if (inch < 12) {
        for (let q = 1; q < 4; q++) {
          const qx = x + q * 19.5;
          const h = q === 2 ? 18 : 12;
          ctx.fillRect(qx - 0.5, canvas.height - h, 1, h);
        }
      }
    }

    // Stamp in center
    ctx.font = 'italic bold 22px "Times New Roman"';
    ctx.fillText("STANDARD QUALITY 30cm RULER", canvas.width / 2, 70);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // School Notebook Page Texture
  static createNotebookTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Off-white / light cream paper
    ctx.fillStyle = '#faf8f2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Blue ruled horizontal lines
    ctx.strokeStyle = '#a8c6e6';
    ctx.lineWidth = 1.8;
    for (let y = 80; y < canvas.height - 40; y += 38) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Red Margin line (Double vertical line on left)
    ctx.strokeStyle = '#e77b7b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(120, 0);
    ctx.lineTo(120, canvas.height);
    ctx.moveTo(126, 0);
    ctx.lineTo(126, canvas.height);
    ctx.stroke();

    // Student handwritten notes & pen doodles
    ctx.font = '22px "Caveat", "Comic Sans MS", cursive';
    ctx.fillStyle = '#1034a6';
    ctx.fillText("Class: X-B", 150, 60);
    ctx.fillText("Subject: Science", 600, 60);

    ctx.fillText("Chapter 4: Force and Laws of Motion", 150, 118);
    ctx.fillText("- A body continues in its state of rest or uniform motion...", 150, 156);
    ctx.fillText("- Momentum depends on mass and velocity (p = mv)", 150, 194);
    ctx.fillText("- Action and Reaction are equal and opposite!", 150, 232);

    // Margin doodles (Tic-tac-toe & pen sketches)
    this.drawTicTacToe(ctx, 30, 220);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // Helper: Heart carved into desk
  static drawCarvedHeart(ctx, x, y, size, text) {
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(x, y + topCurveHeight);
    ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
    ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 1.4, x, y + size);
    ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 1.4, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
    ctx.stroke();

    // Carved Arrow through heart
    ctx.beginPath();
    ctx.moveTo(x - size * 0.6, y + size * 0.8);
    ctx.lineTo(x + size * 0.7, y + size * 0.2);
    // Arrow head
    ctx.lineTo(x + size * 0.5, y + size * 0.18);
    ctx.moveTo(x + size * 0.7, y + size * 0.2);
    ctx.lineTo(x + size * 0.68, y + size * 0.38);
    ctx.stroke();

    if (text) {
      ctx.font = 'bold 24px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.strokeText(text, x, y + size * 0.55);
    }
  }

  // Helper: Compass carved rosette (6-petaled flower with compass arcs)
  static drawCompassRosette(ctx, x, y, r, strokeColor = null) {
    if (strokeColor) ctx.strokeStyle = strokeColor;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Helper: Ink Blot
  static drawInkBlot(ctx, x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    const points = 14;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const dist = radius * (0.6 + Math.random() * 0.7);
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Splash droplets
    for (let j = 0; j < 6; j++) {
      const dropAngle = Math.random() * Math.PI * 2;
      const dropDist = radius * (1.2 + Math.random() * 1.5);
      const dropSize = 2 + Math.random() * 5;
      ctx.beginPath();
      ctx.arc(x + Math.cos(dropAngle) * dropDist, y + Math.sin(dropAngle) * dropDist, dropSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Helper: Pen scribbles
  static drawPenScribble(ctx, x, y, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    let cx = x, cy = y;
    ctx.moveTo(cx, cy);
    for (let i = 0; i < 25; i++) {
      cx += (Math.random() - 0.5) * 35;
      cy += (Math.random() - 0.5) * 35;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // Helper: Tic Tac Toe
  static drawTicTacToe(ctx, x, y) {
    ctx.strokeStyle = '#1034a6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 20, y); ctx.lineTo(x + 20, y + 60);
    ctx.moveTo(x + 40, y); ctx.lineTo(x + 40, y + 60);
    ctx.moveTo(x, y + 20); ctx.lineTo(x + 60, y + 20);
    ctx.moveTo(x, y + 40); ctx.lineTo(x + 60, y + 40);
    ctx.stroke();

    // X and O
    ctx.fillText("X", x + 4, y + 18);
    ctx.fillText("O", x + 24, y + 38);
    ctx.fillText("X", x + 44, y + 58);
  }
}
