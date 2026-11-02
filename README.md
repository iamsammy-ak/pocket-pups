# Pocket Pups

A Nintendogs-style puppy companion game that runs entirely in the browser. Plain HTML, CSS and JavaScript: no build step, no dependencies, no accounts.

**Play now:** https://iamsammy-ak.github.io/pocket-pups/

Works on desktop and phones. On a phone, use your browser's "Add to home screen" and it installs as an app, opens full screen and keeps working offline.

## What you do

Adopt a puppy, then look after it the way the DS game taught us: with your hands and your voice.

| Area | How it works |
| --- | --- |
| Kennel | 16 breeds, 2 or 3 coat colours each. Six breeds are open from the start; the rest unlock with trainer points. |
| Petting | Stroke the puppy on the touch screen. Hearts mean it is happy. Bond grows with every bit of care. |
| Tricks | Pose the puppy with gestures (push its head down for Sit, flick up for Jump, draw a circle for Spin…), then give the trick a command word by typing or speaking. Say the word later and the puppy performs. Mastery rises with practice. |
| Voice | Type in the command bar or tap the mic. Call a puppy by name, praise it with "good girl", or give a trick command. |
| Feeding | Put out bowls of water, milk, kibble, deluxe food or jerky. Hungry puppies come on their own. |
| Toys | Fling a ball, disc, rope or bone and the puppy fetches. Grab the rope while it is held for tug-of-war. The bubble blower makes puppies leap and pop bubbles. |
| Care | Brush the coat, and bathe in three steps: lather, rinse, shake. |
| Walks | Draw your route on a neighbourhood map, like the original. Pass the park for disc practice, the gym for an agility run, the bargain shop for half-price goods, or the fountain for a drink. Along the way: presents, poop to bag, other puppies to greet, trash to pull away from. Rainy days happen. |
| Contests | Disc Competition, Agility Trial and Obedience Trial, each with five classes from Beginner to Championship. Win first place to move up and earn bigger prizes. Three entries a day. |
| Shop | Food, toys, care items, accessories (collars, bandana, bow, cap, sunglasses, tiara) and room interiors. One item is on sale each day. |
| Home | Five rooms (basic, seaside, garden, log cabin with a fire, outer space). Real time of day, a working clock, weather in the window. Puppies sleep in their bed at night and play together. |
| Photos | Tap the camera on the touch screen to save a snapshot to your album. |
| Trainer rank | Bonding, walks, teaching, bathing and contests earn trainer points. Ranks run from Beginner to Legend and unlock breeds, the tiara and the space room. |

Up to three puppies live with you at once. Stats keep dropping while the page is closed (capped at one day), so visit regularly.

## Gestures

| Trick | Gesture |
| --- | --- |
| Sit | Press the head of a standing puppy and push down |
| Lie Down | From Sit, press the head and drag down |
| Beg | From Sit, press the head and drag up |
| Shake | While sitting, tap a front paw |
| Roll Over | While lying, drag sideways |
| Spin | Draw a circle around a standing puppy |
| Jump | Flick upward from a standing puppy |

Double-tap the floor to call every puppy over.

## Run it locally

Open `index.html` in Chrome, Edge or Safari. Everything saves to the browser's local storage. Voice input needs a browser with speech recognition and microphone permission; typing always works.

For the offline install feature you need to serve the folder over HTTP, for example:

```
python -m http.server 8000
```

then open http://localhost:8000/.

## How it is built

- Two 512×384 canvases emulate the DS screens. They scale to any viewport: side by side on desktop inside a DS-style shell, stacked edge to edge on phones. Canvases render at device pixel ratio for crisp lines on high-density screens.
- Every puppy is drawn procedurally from breed parameters (body length, leg length, head size, ears, tail, markings, coat colours) with shading, so there are no sprite sheets to load.
- All item and menu icons are drawn on small canvases or inline SVG, so they look the same on every operating system.
- Sound effects are synthesised with the Web Audio API.
- Save data is a single JSON object in `localStorage`; older saves migrate automatically.

## Files

| File | Contents |
| --- | --- |
| `index.html`, `style.css` | Shell, menus, panels, title screen, design tokens |
| `js/app.js` | Responsive layout, title art, fullscreen and install hooks, service worker registration |
| `js/breeds.js` | Breeds, tricks, items, contest classes, trainer ranks |
| `js/dogdraw.js` | Procedural puppy renderer and hit zones |
| `js/icons.js` | Procedural icon set |
| `js/audio.js` | Synthesised sound effects |
| `js/game.js` | State and saving, home room, petting and gestures, commands, puppy AI, menus, shop, kennel, photos |
| `js/activities.js` | Walk, bath, disc, agility and obedience scenes |
| `js/walkmap.js` | Route drawing map and landmark stops |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline support and home-screen install |

## Credits

Made as a tribute to Nintendogs. Not affiliated with Nintendo.
