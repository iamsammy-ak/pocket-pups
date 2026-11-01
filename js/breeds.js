// Breed definitions for procedural puppies
// ears: floppy | pointy | folded | long | pom
// tail: straight | thick | curl | fluffy | curlfluffy | stub | thin | pom
// marks: belly | blaze | saddle | tri | socks | huskymask | eyebrows | pugmask | corgi

const BREEDS = {
  lab: {
    name: 'Labrador Retriever', price: 600, size: 1.0, bodyLen: 1.0, legLen: 1.0, headR: 1.0,
    snout: 1.0, ears: 'floppy', tail: 'thick', marks: ['belly'],
    desc: 'Friendly, outgoing, and loves to fetch. A perfect first puppy.',
    colors: {
      'Yellow': { base: '#e9c97f', sec: '#f8e8bf', nose: '#3b2a1e' },
      'Black': { base: '#2c2c33', sec: '#45454e', nose: '#111' },
      'Chocolate': { base: '#5c3a26', sec: '#7a5236', nose: '#2a1a10' },
    }
  },
  shiba: {
    name: 'Shiba Inu', price: 800, size: 0.92, bodyLen: 0.95, legLen: 1.0, headR: 1.0,
    snout: 0.9, ears: 'pointy', tail: 'curl', marks: ['huskymask', 'belly'],
    desc: 'Alert and spirited with a fox-like face. Independent but loyal.',
    colors: {
      'Red': { base: '#d9843c', sec: '#fff2df', nose: '#222' },
      'Cream': { base: '#f1e3c5', sec: '#fffaf0', nose: '#3b2a1e' },
      'Black & Tan': { base: '#2a2a30', sec: '#c99055', nose: '#111' },
    }
  },
  beagle: {
    name: 'Beagle', price: 650, size: 0.9, bodyLen: 1.0, legLen: 0.9, headR: 1.0,
    snout: 1.0, ears: 'long', tail: 'straight', marks: ['tri', 'blaze'],
    desc: 'Merry, curious, and led by its nose. Great on walks.',
    colors: {
      'Tricolor': { base: '#c48b4e', sec: '#fbf6ec', ter: '#2b2622', nose: '#111' },
      'Lemon': { base: '#e6c98e', sec: '#fbf6ec', ter: '#d9b06a', nose: '#3b2a1e' },
    }
  },
  dachshund: {
    name: 'Dachshund', price: 700, size: 0.85, bodyLen: 1.45, legLen: 0.55, headR: 0.95,
    snout: 1.3, ears: 'long', tail: 'thin', marks: ['eyebrows'],
    desc: 'A long, low sausage dog with a big personality.',
    colors: {
      'Red': { base: '#b3602a', sec: '#c9793f', nose: '#222' },
      'Black & Tan': { base: '#232328', sec: '#c58b4a', nose: '#111' },
      'Chocolate': { base: '#5a3a26', sec: '#b88a5a', nose: '#2a1a10' },
    }
  },
  shepherd: {
    name: 'German Shepherd', price: 900, size: 1.08, bodyLen: 1.1, legLen: 1.05, headR: 1.0,
    snout: 1.15, ears: 'pointy', tail: 'fluffy', marks: ['saddle', 'eyebrows'],
    desc: 'Confident, clever, and eager to learn tricks.',
    colors: {
      'Black & Tan': { base: '#b98a4a', sec: '#1f1d1d', nose: '#111' },
      'Sable': { base: '#8d7250', sec: '#3a2f27', nose: '#111' },
    }
  },
  pug: {
    name: 'Pug', price: 750, size: 0.8, bodyLen: 0.9, legLen: 0.75, headR: 1.15,
    snout: 0.35, ears: 'folded', tail: 'curl', marks: ['pugmask'],
    desc: 'A wrinkly little clown that snorts when happy.',
    colors: {
      'Fawn': { base: '#d8b98a', sec: '#2a2320', nose: '#111' },
      'Black': { base: '#2a2a2f', sec: '#1a1a1e', nose: '#111' },
    }
  },
  corgi: {
    name: 'Welsh Corgi', price: 850, size: 0.85, bodyLen: 1.25, legLen: 0.55, headR: 1.0,
    snout: 1.0, ears: 'pointy', tail: 'stub', marks: ['corgi', 'blaze'],
    desc: 'Short legs, big ears, bigger smile.',
    colors: {
      'Red & White': { base: '#d58b47', sec: '#fff8ee', nose: '#111' },
      'Tricolor': { base: '#2c2a2a', sec: '#fff8ee', ter: '#c58b4a', nose: '#111' },
    }
  },
  chihuahua: {
    name: 'Chihuahua', price: 550, size: 0.65, bodyLen: 0.9, legLen: 0.9, headR: 1.2,
    snout: 0.7, ears: 'pointy', tail: 'thin', marks: ['belly'],
    desc: 'Tiny body, enormous attitude. Fits in a teacup.',
    colors: {
      'Fawn': { base: '#dcb98f', sec: '#f6e9d6', nose: '#3b2a1e' },
      'Black': { base: '#26262b', sec: '#c58b4a', nose: '#111' },
      'White': { base: '#f7f3ea', sec: '#ffffff', nose: '#3b2a1e' },
    }
  },
  golden: {
    name: 'Golden Retriever', price: 700, size: 1.05, bodyLen: 1.05, legLen: 1.0, headR: 1.0,
    snout: 1.05, ears: 'floppy', tail: 'fluffy', marks: ['belly'], fluffy: true,
    desc: 'Gentle, devoted, and always happy to see you.',
    colors: {
      'Golden': { base: '#e2b25a', sec: '#f3d99a', nose: '#222' },
      'Cream': { base: '#f0dfb6', sec: '#fbf3dd', nose: '#3b2a1e' },
    }
  },
  husky: {
    name: 'Siberian Husky', price: 950, size: 1.05, bodyLen: 1.05, legLen: 1.05, headR: 1.0,
    snout: 1.05, ears: 'pointy', tail: 'curlfluffy', marks: ['huskymask', 'belly'], eye: '#7fc4e8',
    desc: 'A howling, energetic sled dog with icy blue eyes.',
    colors: {
      'Gray & White': { base: '#6f737a', sec: '#f7f7f7', nose: '#111' },
      'Red & White': { base: '#b5704a', sec: '#f7f7f7', nose: '#4a2a1a' },
      'Black & White': { base: '#2a2b30', sec: '#f7f7f7', nose: '#111' },
    }
  },
  poodle: {
    name: 'Toy Poodle', price: 800, size: 0.78, bodyLen: 0.9, legLen: 1.0, headR: 1.0,
    snout: 0.9, ears: 'pom', tail: 'pom', marks: [], fluffy: true,
    desc: 'Clever and elegant, with a curly coat of clouds.',
    colors: {
      'Apricot': { base: '#eec89a', sec: '#f8e3c2', nose: '#3b2a1e' },
      'White': { base: '#f8f5ee', sec: '#ffffff', nose: '#3b2a1e' },
      'Black': { base: '#2a2a2f', sec: '#3a3a40', nose: '#111' },
    }
  },
  boxer: {
    name: 'Boxer', price: 850, size: 1.05, bodyLen: 1.0, legLen: 1.05, headR: 1.05,
    snout: 0.6, ears: 'folded', tail: 'stub', marks: ['pugmask', 'socks', 'belly'],
    desc: 'Playful, bouncy, and full of energy for contests.',
    colors: {
      'Fawn': { base: '#c48a52', sec: '#fff6ea', nose: '#111' },
      'Brindle': { base: '#7a5236', sec: '#fff6ea', nose: '#111' },
    }
  },
};

const TRICKS = {
  sit:    { name: 'Sit',        hint: "Press the puppy's head and push down while it stands." },
  lie:    { name: 'Lie Down',   hint: 'While sitting, press the head and drag down.' },
  beg:    { name: 'Beg',        hint: 'While sitting, press the head and drag up.' },
  shake:  { name: 'Shake',      hint: 'While sitting, tap one of the front paws.' },
  roll:   { name: 'Roll Over',  hint: 'While lying down, drag the puppy sideways.' },
  spin:   { name: 'Spin',       hint: 'Draw a circle around the puppy while it stands.' },
  jump:   { name: 'Jump',       hint: 'While standing, flick upward from the puppy.' },
};

const ITEMS = {
  // food
  water:    { name: 'Water',        type: 'food',  price: 0,   desc: 'Fresh tap water. Always free.', thirst: 60, hunger: 0, happy: 2 },
  dryfood:  { name: 'Dry Food',     type: 'food',  price: 8,   desc: 'Balanced kibble. Fills the tummy.', hunger: 55, thirst: -5, happy: 4 },
  deluxe:   { name: 'Deluxe Food',  type: 'food',  price: 20,  desc: 'Gourmet meal. Puppies love it.', hunger: 75, thirst: 0, happy: 14 },
  milk:     { name: 'Milk',         type: 'food',  price: 10,  desc: 'Creamy milk. Quenches and comforts.', thirst: 55, hunger: 12, happy: 8 },
  jerky:    { name: 'Jerky Treat',  type: 'food',  price: 15,  desc: 'A chewy treat. Boosts your bond.', hunger: 15, thirst: -5, happy: 15, bond: 3 },
  // toys
  ball:     { name: 'Tennis Ball',  type: 'toy',   price: 5,   desc: 'Throw it and your puppy will fetch!', color: '#d6e64a' },
  frisbee:  { name: 'Flying Disc',  type: 'toy',   price: 12,  desc: 'Practice for the Disc Competition.', color: '#ff6b6b' },
  rope:     { name: 'Rope Toy',     type: 'toy',   price: 9,   desc: 'Tug of war fun.', color: '#e7d3a9' },
  bone:     { name: 'Rubber Bone',  type: 'toy',   price: 7,   desc: 'Squeaky and chewy.', color: '#9ad0ff' },
  // care
  brush:    { name: 'Brush',        type: 'care',  price: 30,  desc: 'Brush the coat to keep it tidy. Lasts forever.' },
  shampoo:  { name: 'Shampoo',      type: 'care',  price: 25,  desc: 'One bottle gives one full bath.' },
  // accessories
  collar_red:   { name: 'Red Collar',   type: 'acc', price: 40,  slot: 'neck', desc: 'A classic red collar.', color: '#d63b3b' },
  collar_blue:  { name: 'Blue Collar',  type: 'acc', price: 40,  slot: 'neck', desc: 'A cool blue collar.', color: '#3b78d6' },
  bandana:      { name: 'Bandana',      type: 'acc', price: 60,  slot: 'neck', desc: 'A cheerful red bandana.', color: '#e0523c' },
  bow:          { name: 'Ribbon Bow',   type: 'acc', price: 50,  slot: 'head', desc: 'A pretty pink bow.', color: '#ff7eb6' },
  cap:          { name: 'Baseball Cap', type: 'acc', price: 80,  slot: 'head', desc: 'Sporty and cute.', color: '#2f74d0' },
  shades:       { name: 'Sunglasses',   type: 'acc', price: 120, slot: 'face', desc: 'Too cool for the dog park.', color: '#222' },
  tiara:        { name: 'Tiara',        type: 'acc', price: 220, slot: 'head', desc: 'For the true champion.', color: '#ffd84a' },
  // interiors
  room_basic:   { name: 'Basic Room',   type: 'room', price: 0,    desc: 'Cozy and simple.' },
  room_seaside: { name: 'Seaside Room', type: 'room', price: 500,  desc: 'Sunny beach vibes.' },
  room_cabin:   { name: 'Log Cabin',    type: 'room', price: 800,  desc: 'Warm wooden lodge.' },
  room_space:   { name: 'Outer Space',  type: 'room', price: 1500, desc: 'A room among the stars.' },
};

const CONTEST_CLASSES = ['Beginner', 'Open', 'Expert', 'Master', 'Championship'];
const CONTEST_PRIZES = [[200, 100, 50], [400, 200, 100], [700, 350, 150], [1200, 600, 300], [2000, 1000, 500]];

const DOG_NAMES = ['Biscuit','Mochi','Pepper','Luna','Max','Daisy','Milo','Coco','Peanut','Bella','Rocky','Waffles','Nori','Ginger','Pudding','Ollie','Hazel','Ziggy','Maple','Taro'];
