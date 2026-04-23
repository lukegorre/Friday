# Gesture Control System — Project Brief for Claude Code

## What This Project Is
A desktop gesture control system built around a **Leap Motion Controller** — a hardware sensor that tracks hand and finger position in 3D space in real time. The system interprets hand shapes and motions into OS-level and app-level actions (window management, volume, app switching, Discord control, etc.), surfaced through a minimal persistent HUD.

---

## Hardware & Gesture Input
The system receives hand tracking data from a Leap Motion Controller mounted at the front edge of the desk, angled 15° upward. The sensor outputs continuous 3D position, velocity, and finger state data for any hands present in the activation zone.

**Activation zone:** 5cm above sensor, 40cm wide × 30cm deep × 25cm tall
**Confidence threshold:** 82% — a gesture must reach this certainty before any action fires
**Cooldown:** 350ms between repeated fires of the same gesture (prevents tremor double-triggers)

### How to Handle the Gesture Input Layer
Build the entire system — the action engine, profile system, layer logic, HUD, and all integrations — as if gesture data is already flowing in. Design the gesture recognition and input pipeline properly and completely. The Leap Motion SDK will be wired into the input layer when the hardware is physically available. That integration is a future task and does not block anything. Everything else gets built now, built correctly, and built to full spec.

Do not build mocks. Do not build a simulator. Do not add a dev panel for faking gestures. Design the system as it will actually work.

---

## Gesture Vocabulary
Eleven physical hand shapes and motions form the entire system vocabulary:

| Name | Description |
|---|---|
| Two-finger flick | Index + middle extended, others curled, quick directional wrist flick |
| Pinch | Thumb + index extended forward, others curled, tips brought together |
| Gun shape | Thumb + index extended, others curled, held still |
| Hang loose | Thumb + pinky extended, middle three curled, held still |
| Thumbs up | Fist with thumb extended upward |
| Thumbs down | Fist with thumb extended downward |
| Index point + twist | Index extended, others curled, wrist rotated left or right |
| Open palm | All five fingers flat, palm facing sensor |
| Snap to fist | Open hand rapidly closing to a fist |
| Peace sign | Index + middle extended and spread, others curled |
| Wrist shoo | Relaxed hand, quick outward wrist flick |
| Dial rotate | All five fingers open, palm facing sensor, rotate wrist CW/CCW — 15° dead zone before change registers. CW = raise, CCW = lower. Rotation speed maps to rate of change. |

---

## Three Layers of Control

### Layer 1 — Profile Layer (always active)
Switches automatically based on the foreground application. No user action required.

**Four hardwired gestures — cannot be remapped, work in all layers:**
| Gesture | Action |
|---|---|
| Wrist shoo | Summon / Banish — toggle HUD on/off |
| Peace sign (hold 600ms) | Cheat Sheet — open full gesture reference overlay |
| Open palm | Silence — mute/unmute system audio |
| Snap to fist | Dismiss — minimize active window |

**Twelve remappable right-hand gestures (global base profile defaults):**
| Gesture | Action |
|---|---|
| Two-finger flick right | App Forward — cycle to next open application |
| Two-finger flick left | App Back — cycle to previous application |
| Two-finger flick up | Window Grow — maximize or restore active window |
| Two-finger flick down | Window Shrink — minimize active window |
| Pinch (hold 500ms) | Window Close — close active window |
| Gun shape (hold 300ms) | Overview — Task View (Windows) / Mission Control (Mac) |
| Hang loose (hold 300ms) | Clear Desk — hide all windows, show desktop |
| Index twist right (CW) | Desktop Right — move to next virtual desktop |
| Index twist left (CCW) | Desktop Left — move to previous virtual desktop |
| Thumbs up | Louder — system volume +10% |
| Thumbs down | Quieter — system volume -10% |
| Double pinch | Play/Stop — toggle system-wide media playback |

---

### Layer 2 — Modifier Layer (passive activation)
**Entry:** Left hand held open, flat, and still in zone — moving less than 1.5cm/sec. No deliberate gesture required. Resting the hand is enough.
**Exit:** Left hand leaves zone or moves above velocity threshold.
**Visual indicator:** HUD tints blue, modifier pill appears in header, slot descriptions swap to secondary actions.

**Secondary actions (right-hand gestures while modifier active):**
| Gesture | Action |
|---|---|
| Two-finger flick right | Snap window to right half of screen |
| Two-finger flick left | Snap window to left half of screen |
| Two-finger flick up | Move window to next monitor |
| Two-finger flick down | Move window to previous monitor |
| Pinch (hold 800ms) | Force quit active application |
| Gun shape (hold 300ms) | Create new virtual desktop |
| Hang loose (hold 300ms) | Close current virtual desktop |
| Index twist right | Send active window to next virtual desktop (user doesn't follow) |
| Index twist left | Send active window to previous virtual desktop |
| Thumbs up | Screen brightness +10% |
| Thumbs down | Screen brightness -10% |
| Double pinch | Next track |
| Open palm | Toggle night mode system-wide |

---

### Layer 3 — Background App Layer (gaming / persistent)
**Entry:** Left-hand pinch held 800ms. Two-tone ascending chime plays on entry.
**Exit:** Left-hand pinch held 800ms again, or open palm. Descending tone plays on exit.
**Behavior:** No auto-close. Stays active for the full session until manually dismissed. Intentional for gaming use.
**Summon/Banish in this layer:** Hides/shows the Background Panel without exiting the layer.

**Right hand — Discord + media:**
| Gesture | Action |
|---|---|
| Index up (hold 400ms) | Go Quiet — toggle Discord mic mute |
| Closed fist (hold 400ms) | Go Dark — toggle Discord deafen |
| Quick index tap down | Talk — toggle push-to-talk |
| Pinch (hold 800ms) | Leave — disconnect from voice channel |
| Double pinch | Play/Stop — toggle Spotify playback |
| Thumbs up | Next track |
| Thumbs down | Previous track |
| Dial rotate | Spotify volume — continuous, speed-mapped |

**Left hand — audio routing:**
| Gesture | Action |
|---|---|
| Flick right | Out Switch — cycle to next audio output device |
| Flick left | In Switch — cycle to next audio input device |

---

## Context Profiles
Profiles activate automatically based on the foreground application. Each inherits all global base gestures and only overrides what is meaningfully different in that context.

### Global Base
Fallback for any app without a dedicated profile. Uses the twelve default actions above.

### Browser
**Apps:** Chrome, Firefox, Arc, Edge, Safari
| Override | Action |
|---|---|
| Flick right | Browser history forward |
| Flick left | Browser history back |
| Thumbs up | Scroll to top |
| Thumbs down | Scroll to bottom |
| Gun shape | Zoom in |
| Hang loose | Zoom out |

### Media Player
**Apps:** Spotify, VLC, YouTube, Netflix, Twitch, browser tabs whose title contains a known streaming service name
| Override | Action |
|---|---|
| Flick right | Skip forward 30 seconds |
| Flick left | Skip back 10 seconds (asymmetric — back is for catching missed moments) |
| Pinch (no hold) | Toggle play/pause |
| Gun shape | Toggle fullscreen |
| Wrist twist | Adjust playback speed |

### Creative Tools
**Apps:** Photoshop, Figma, Illustrator, Affinity apps
| Override | Action |
|---|---|
| Flick left | Undo |
| Flick right | Redo |
| Thumbs up | Brush size up |
| Thumbs down | Brush size down |
| Wrist twist | Move up/down through layers |

### Code Editor
**Apps:** VS Code, JetBrains IDEs, Xcode, Sublime Text
| Override | Action |
|---|---|
| Flick right | Go to definition |
| Flick left | Go back |
| Thumbs up | Move current line up |
| Thumbs down | Move current line down |

### Communication
**Apps:** Zoom, Teams, Google Meet, Discord (foreground)
| Override | Action |
|---|---|
| Open palm | In-app mic mute (not system mute) |
| Gun shape | Camera on |
| Hang loose | Camera off |
| Flick up | Raise hand |
| Pinch (hold) | Exit call |

### Documents
**Apps:** Word, Notion, Obsidian, PDF viewers
| Override | Action |
|---|---|
| Flick right | Next page |
| Flick left | Previous page |
| Thumbs up | Font size up |
| Thumbs down | Font size down |
| Gun shape | Open reading view |

---

## The HUD

### Design Philosophy
The HUD should be minimal, purposeful, and visually strong. Every element must justify its presence. Good design is the starting point — draw on whatever references produce the best result, but do not copy any specific aesthetic. The principles below define the standard.

**Restraint first.** The HUD spends most of its life invisible or nearly invisible. It must never compete with the user's actual work. When it does appear, it should feel inevitable — exactly the right amount of information, exactly when it is needed.

**Typography carries the weight.** Use system fonts. Let type hierarchy do the work that lesser designs use decoration for. No icons unless they are universally understood at a glance without a label.

**Motion is communication.** Every animation has a reason. State transitions feel physical and fluid. The confidence arc fills with momentum. Failure states are short and honest. Nothing animates for its own sake.

**Color is reserved for meaning.** The default state is near-monochromatic. Color appears only when it carries information — blue tint for modifier active, green/amber/red for sensor status, red for Discord muted, green for Discord live. Color is a signal, not decoration.

**Density scales with need.** State 1 is nearly nothing. State 2 is almost nothing. State 3 is the minimum required to confirm what is happening. The cheat sheet is the only moment the HUD is allowed to take significant screen space, and only because the user deliberately asked for it.

---

### Live Panel

**State 1 — No hands in zone**
40px strip, bottom-right corner. Profile name in a small medium-weight label. Sensor status dot — 6px circle, green/amber/red, no label. Nothing else. Nearly unnoticeable.

**State 2 — Hands present, no gesture activity**
Expands to a single slim bar with a spring animation. Adds four system values in a compact inline row: system volume (%), screen brightness (%), audio output alias, audio input alias. Values separated by thin dividers. Device names must be user-aliased in the config app — raw OS names are never shown in the HUD. No gesture slots. The panel at this state feels like a status bar, not a control panel.

**State 3 — Gesture forming**
A single slot expands below the bar with a spring curve. The slot contains:
- Gesture name — medium weight, full size
- Action description — small, secondary text color (60% opacity white)
- Confidence arc — a thin stroke arc originating from both ends of the slot bottom edge, filling toward center as confidence rises

When arc completes: slot briefly pulses white (120ms, spring out). On failure: slot shakes subtly (left-right, 200ms), arc resets, panel returns to State 2.

Only one slot at a time. When the modifier is active: the panel surface shifts to a deep blue-tinted material, a small "MOD" pill appears in the header, and the slot shows the secondary action. The tint is unmistakable but not aggressive.

**State 4 — Cheat Sheet**
Full reference overlay, centered on screen. Frosted glass panel, generous padding, clear section hierarchy. Three sections: Hardwired, Right Hand, Modifier. Each row: gesture name left-aligned, action right-aligned, physical motion description as secondary text beneath the gesture name. Profile-aware — the user sees only gestures relevant to their current context. Dismissed by peace sign hold or Summon/Banish.

The cheat sheet should feel like something from an Apple product manual — calm, clear, confident.

---

### Background App Panel
Replaces the Live Panel when Layer 3 is active. Centered on screen. Dark semi-opaque material — dark enough to read over any game UI, not a black rectangle. Subtle border at 10% white opacity.

**Four widgets in a 2×2 grid:**

**Discord widget**
Mic state and deafen state as large, immediately readable indicators. Active = green label, muted = red label — large enough to read at a peripheral glance mid-game. Current voice channel name beneath. Updates live via Discord IPC.

**Spotify widget**
Track name, artist, volume (%), progress bar with elapsed/total time. Volume updates in real time as dial rotate fires. Progress bar is thin and accent-colored. No album art — it would dominate.

**Audio widget**
Current output and input device, aliased. Updates immediately when routing gestures fire.

**System widget**
System volume (%), screen brightness (%), night mode state (on/off).

**Footer strip**
Single line across the bottom of the panel: volume · brightness · night mode · output device. Separator dots between values. At-a-glance confirmation only.

---

## Device Name Aliasing
The config app must allow the user to define short display aliases for each audio device. Aliases are used everywhere in the HUD. Raw OS device names are only shown inside the config app.

---

## Development Order
1. Action execution engine — OS-level calls for window management, volume, brightness, app switching, virtual desktops
2. Profile system — foreground app detection, profile inheritance, override resolution
3. Layer system — Layer 1 always-on, Layer 2 passive left-hand detection, Layer 3 toggle with audio cues
4. Live Panel HUD — all four states, correct animations, modifier visual behavior
5. Background App Panel — Discord IPC integration, Spotify local API, audio routing
6. Config app — device aliasing, gesture remapping, profile management
7. Gesture input layer — wire in the Leap Motion SDK when hardware is available
