export const TOURNAMENT_STAGES = [
  {
    stage: 1,
    title: 'Room 4B: The Backbench',
    location: 'Standard Classroom Desk',
    opponentName: 'Bunty "The Spinner"',
    opponentPen: 'reynolds045',
    opponentColor: '#0044cc',
    aiDifficulty: 'easy',
    targetScore: 3,
    deskWidth: 7.6,
    deskDepth: 4.8,
    obstacles: []
  },
  {
    stage: 2,
    title: 'Study Hall: The Notebook Barrier',
    location: 'Study Hall Desk with Obstacles',
    opponentName: 'Pooja "Class Topper"',
    opponentPen: 'cello_gripper',
    opponentColor: '#222222',
    aiDifficulty: 'medium',
    targetScore: 3,
    deskWidth: 7.6,
    deskDepth: 4.8,
    obstacles: [
      { type: 'box', pos: { x: 0, y: 0 }, size: { x: 1.6, y: 0.9 }, angle: 0.1, bounce: 0.75 }
    ]
  },
  {
    stage: 3,
    title: 'Central Library: The Oak Table',
    location: 'Quiet Library Table',
    opponentName: 'Vikram "The Tactician"',
    opponentPen: 'pilot_v5',
    opponentColor: '#0055dd',
    aiDifficulty: 'medium',
    targetScore: 4,
    deskWidth: 8.4,
    deskDepth: 5.2,
    obstacles: [
      { type: 'box', pos: { x: -2.0, y: 0 }, size: { x: 0.7, y: 0.38 }, angle: 0.4, bounce: 0.65 },
      { type: 'box', pos: { x: 2.0, y: 0 }, size: { x: 1.6, y: 0.9 }, angle: -0.25, bounce: 0.75 }
    ]
  },
  {
    stage: 4,
    title: 'Final Exam Hall: The Championship',
    location: 'Narrow High-Stakes Exam Desk',
    opponentName: 'Rocky "School Champion"',
    opponentPen: 'parker_vector',
    opponentColor: '#cccccc',
    aiDifficulty: 'hard',
    targetScore: 5,
    deskWidth: 6.8,
    deskDepth: 4.2,
    obstacles: [
      { type: 'box', pos: { x: 0, y: 0 }, size: { x: 0.7, y: 0.38 }, angle: 0.4, bounce: 0.65 }
    ]
  }
];

export const TRICK_CHALLENGES = [
  {
    id: 1,
    title: 'Ruler Bank Shot',
    desc: 'Bank your pen off the 30cm wooden ruler to knock the target pen off the desk!',
    hint: '💡 Aim at the top wooden ruler at ~35° angle with Yellow Power (55-65%) to bank into the target!',
    playerPos: { x: -1.4, z: 1.5, angle: 0.3 },
    targetPos: { x: 1.8, z: -1.2, angle: 0 },
    props: {
      ruler: { x: 0.2, z: -2.0, angle: 0.05, visible: true },
      geomBox: { visible: false },
      eraser: { visible: false },
      notebook: { visible: false }
    },
    parShots: 2
  },
  {
    id: 2,
    title: 'Natraj Eraser Deflection',
    desc: 'Deflect your shot off the Natraj eraser into the target pen parked on the left!',
    hint: '💡 Shoot directly into the angled Natraj eraser with Solid Yellow Power (~60%) to deflect into the target!',
    playerPos: { x: 1.4, z: 1.5, angle: -0.2 },
    targetPos: { x: -2.2, z: -1.0, angle: 1.57 },
    props: {
      eraser: { x: 0.0, z: 0.1, angle: 0.45, visible: true },
      ruler: { visible: false },
      geomBox: { visible: false },
      notebook: { visible: false }
    },
    parShots: 2
  },
  {
    id: 3,
    title: 'Behind the Geometry Box',
    desc: 'Bank around the Camlin geometry box to knock out the hidden opponent pen!',
    hint: '💡 Bank off the wooden border or use [Q] Spin Whip with ~70% Power to hook behind the metal box!',
    playerPos: { x: -1.8, z: 1.5, angle: 0.1 },
    targetPos: { x: 2.0, z: -1.3, angle: 1.57 },
    props: {
      geomBox: { x: 0.2, z: -0.1, angle: -0.25, visible: true },
      ruler: { x: 0.2, z: -2.0, angle: 0.05, visible: true },
      eraser: { visible: false },
      notebook: { visible: false }
    },
    parShots: 3
  },
  {
    id: 4,
    title: 'Double Strike Split',
    desc: 'Knock TWO opponent pens off the desk simultaneously with one well-placed power flick!',
    hint: '💡 Press [Q] for Spin Whip, aim right between the two pens, and release at ~80% Power for maximum sweep!',
    playerPos: { x: 0, z: 1.6, angle: 0 },
    targets: [
      { x: -0.85, z: -0.8, angle: 0.3 },
      { x: 0.85, z: -0.8, angle: -0.3 }
    ],
    props: {
      geomBox: { visible: false },
      ruler: { visible: false },
      eraser: { visible: false },
      notebook: { visible: false }
    },
    parShots: 2
  },
  {
    id: 5,
    title: 'The Narrow Corridor',
    desc: 'Thread your pen through the narrow gap between the Notebook and Ruler to eliminate the Champion Parker pen!',
    hint: '💡 Use Straight Drive [W] with ~50% Power to thread the needle without touching the sides!',
    playerPos: { x: 0, z: 1.7, angle: 0 },
    targetPos: { x: 0, z: -1.6, angle: 3.14 },
    props: {
      notebook: { x: -1.6, z: 0.0, angle: 0.0, visible: true },
      ruler: { x: 1.6, z: 0.0, angle: 1.57, visible: true },
      geomBox: { visible: false },
      eraser: { visible: false }
    },
    parShots: 2
  }
];
