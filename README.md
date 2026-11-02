# Pocket Pups

A Nintendogs-style puppy companion game that runs entirely in the browser. No build step, no dependencies.

## Play

**Play online:** https://iamsammy-ak.github.io/pocket-pups/

Or open `index.html` in Chrome or Edge (double-click it). Everything saves automatically to the browser's local storage.

Voice commands use the browser's speech recognition. If the microphone is blocked or unsupported, type commands in the command bar instead; both work the same.

## What you can do

- **Kennel**: adopt up to 3 puppies from 12 breeds, each with several coat colours. Name them by typing or speaking.
- **Pet**: click and stroke a puppy. Hearts mean it is happy; bond grows with care.
- **Teach tricks** with gestures, then give the trick a command word:
  - Sit: press the head and push down while standing
  - Lie Down: from Sit, press the head and drag down
  - Beg: from Sit, press the head and drag up
  - Shake: while sitting, tap a front paw
  - Roll Over: while lying, drag sideways
  - Spin: draw a circle around a standing puppy
  - Jump: flick upward from a standing puppy
- **Commands**: type or say a learned word, a puppy's name (it comes running), or "good girl/boy". Mastery rises with practice.
- **Supplies**: put out food and water bowls, toss toys, dress puppies in accessories.
- **Fetch**: drag a toy and fling it. Frisbee practice raises Disc skill.
- **Care**: brush (stroke with brush mode on) and bathe (lather with the sponge, rinse with the shower).
- **Go Out**: walks with presents, poop to bag, other puppies to greet, and trash to pull away from (3 a day).
- **Contests** (3 entries a day): Disc Competition, Agility Trial (SPACE or tap at the right moment), Obedience Trial. Win first place to move up a class and earn bigger prizes.
- **Shop**: food, toys, shampoo, brush, accessories and room interiors.

Stats decay over time, even while the page is closed (capped at one day), so visit your puppies regularly.

## Files

- `index.html`, `style.css`: DS-style two-screen shell and menus
- `js/breeds.js`: breed, trick, item and contest data
- `js/dogdraw.js`: procedural puppy renderer (all breeds, poses, markings, accessories)
- `js/audio.js`: synthesized sound effects
- `js/game.js`: state, saving, home room, petting, gestures, commands, menus, shop, kennel
- `js/activities.js`: walk, bath, disc, agility and obedience scenes
