import fp from "fingerpose";

const { GestureDescription, Finger, FingerCurl, FingerDirection } = fp;

// A — fist with thumb to the side
const aSign = new GestureDescription("A");
aSign.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
aSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
aSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
aSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
aSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);
aSign.addDirection(Finger.Thumb, FingerDirection.VerticalUp, 0.7);

// B — flat hand, fingers up, thumb tucked
const bSign = new GestureDescription("B");
bSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
bSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
bSign.addCurl(Finger.Ring, FingerCurl.NoCurl, 1.0);
bSign.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);
bSign.addCurl(Finger.Thumb, FingerCurl.FullCurl, 0.6);
bSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7);

// C — curved hand (all fingers half curl)
const cSign = new GestureDescription("C");
cSign.addCurl(Finger.Index, FingerCurl.HalfCurl, 1.0);
cSign.addCurl(Finger.Middle, FingerCurl.HalfCurl, 1.0);
cSign.addCurl(Finger.Ring, FingerCurl.HalfCurl, 1.0);
cSign.addCurl(Finger.Pinky, FingerCurl.HalfCurl, 1.0);
cSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 0.5);

// D — index up, others curled, thumb touching middle
const dSign = new GestureDescription("D");
dSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
dSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.9);
dSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
dSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
dSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
dSign.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.6);

// E — all fingers curled into palm, thumb tucked across
const eSign = new GestureDescription("E");
eSign.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
eSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
eSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
eSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
eSign.addCurl(Finger.Thumb, FingerCurl.FullCurl, 1.0);

// F — O with index, middle+ring+pinky extended up
const fSign = new GestureDescription("F");
fSign.addCurl(Finger.Index, FingerCurl.HalfCurl, 1.0);
fSign.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 1.0);
fSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
fSign.addCurl(Finger.Ring, FingerCurl.NoCurl, 1.0);
fSign.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);
fSign.addDirection(Finger.Middle, FingerDirection.VerticalUp, 0.7);

// G — index pointing forward horizontally, thumb parallel
const gSign = new GestureDescription("G");
gSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
gSign.addDirection(Finger.Index, FingerDirection.HorizontalLeft, 0.7);
gSign.addDirection(Finger.Index, FingerDirection.HorizontalRight, 0.7);
gSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
gSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
gSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
gSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 0.8);

// H — index + middle pointing horizontally
const hSign = new GestureDescription("H");
hSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
hSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
hSign.addDirection(Finger.Index, FingerDirection.HorizontalLeft, 0.7);
hSign.addDirection(Finger.Index, FingerDirection.HorizontalRight, 0.7);
hSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
hSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
hSign.addCurl(Finger.Thumb, FingerCurl.FullCurl, 0.5);

// I — pinky up, rest curled
const iSign = new GestureDescription("I");
iSign.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
iSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
iSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
iSign.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);
iSign.addDirection(Finger.Pinky, FingerDirection.VerticalUp, 0.9);
iSign.addCurl(Finger.Thumb, FingerCurl.FullCurl, 0.5);

// K — index up, middle angled forward, thumb between them
const kSign = new GestureDescription("K");
kSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
kSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.8);
kSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
kSign.addDirection(Finger.Middle, FingerDirection.DiagonalUpRight, 0.5);
kSign.addDirection(Finger.Middle, FingerDirection.DiagonalUpLeft, 0.5);
kSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
kSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
kSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 0.8);

// L — index up + thumb out
const lSign = new GestureDescription("L");
lSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
lSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7);
lSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
lSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
lSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
lSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);
lSign.addDirection(Finger.Thumb, FingerDirection.HorizontalLeft, 0.5);
lSign.addDirection(Finger.Thumb, FingerDirection.HorizontalRight, 0.5);

// M — three fingers over thumb, fist facing down
const mSign = new GestureDescription("M");
mSign.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
mSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
mSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
mSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
mSign.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.8);
mSign.addDirection(Finger.Index, FingerDirection.VerticalDown, 0.7);

// N — two fingers over thumb, fist facing down
const nSign = new GestureDescription("N");
nSign.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
nSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
nSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
nSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
nSign.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.8);
nSign.addDirection(Finger.Index, FingerDirection.VerticalDown, 0.5);

// O — all fingers curled to touch thumb
const oSign = new GestureDescription("O");
oSign.addCurl(Finger.Index, FingerCurl.HalfCurl, 0.8);
oSign.addCurl(Finger.Middle, FingerCurl.HalfCurl, 0.8);
oSign.addCurl(Finger.Ring, FingerCurl.HalfCurl, 0.8);
oSign.addCurl(Finger.Pinky, FingerCurl.HalfCurl, 0.8);
oSign.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.8);

// P — like K but pointing down
const pSign = new GestureDescription("P");
pSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
pSign.addDirection(Finger.Index, FingerDirection.VerticalDown, 0.7);
pSign.addDirection(Finger.Index, FingerDirection.DiagonalDownLeft, 0.5);
pSign.addDirection(Finger.Index, FingerDirection.DiagonalDownRight, 0.5);
pSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
pSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
pSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
pSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 0.7);

// Q — like G but pointing down
const qSign = new GestureDescription("Q");
qSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
qSign.addDirection(Finger.Index, FingerDirection.VerticalDown, 0.8);
qSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
qSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
qSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
qSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 0.8);
qSign.addDirection(Finger.Thumb, FingerDirection.VerticalDown, 0.5);

// R — index + middle crossed and up
const rSign = new GestureDescription("R");
rSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
rSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
rSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.8);
rSign.addDirection(Finger.Middle, FingerDirection.VerticalUp, 0.8);
rSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
rSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
rSign.addCurl(Finger.Thumb, FingerCurl.FullCurl, 0.7);

// S — fist, thumb over fingers
const sSign = new GestureDescription("S");
sSign.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
sSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
sSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
sSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
sSign.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 1.0);
sSign.addDirection(Finger.Thumb, FingerDirection.HorizontalLeft, 0.5);
sSign.addDirection(Finger.Thumb, FingerDirection.HorizontalRight, 0.5);

// T — thumb between index and middle, fist
const tSign = new GestureDescription("T");
tSign.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
tSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
tSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
tSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
tSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 0.8);
tSign.addDirection(Finger.Thumb, FingerDirection.VerticalUp, 0.6);

// U — index + middle up together
const uSign = new GestureDescription("U");
uSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
uSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
uSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.8);
uSign.addDirection(Finger.Middle, FingerDirection.VerticalUp, 0.8);
uSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
uSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
uSign.addCurl(Finger.Thumb, FingerCurl.FullCurl, 0.7);

// V — index + middle up, rest curled (peace sign)
const vSign = new GestureDescription("V");
vSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
vSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
vSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
vSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
vSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7);
vSign.addDirection(Finger.Middle, FingerDirection.VerticalUp, 0.7);

// W — index + middle + ring up
const wSign = new GestureDescription("W");
wSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
wSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
wSign.addCurl(Finger.Ring, FingerCurl.NoCurl, 1.0);
wSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
wSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7);

// X — index hook (half curl), rest curled
const xSign = new GestureDescription("X");
xSign.addCurl(Finger.Index, FingerCurl.HalfCurl, 1.0);
xSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7);
xSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
xSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
xSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
xSign.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.6);

// Y — thumb + pinky out, rest curled
const ySign = new GestureDescription("Y");
ySign.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
ySign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
ySign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
ySign.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);
ySign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);

// Note: J and Z require motion and cannot be detected with static fingerpose.

export const ASL_GESTURES = [
  aSign, bSign, cSign, dSign, eSign, fSign, gSign, hSign,
  iSign, kSign, lSign, mSign, nSign, oSign, pSign, qSign,
  rSign, sSign, tSign, uSign, vSign, wSign, xSign, ySign,
];

export const SUPPORTED_LETTERS = [
  "A","B","C","D","E","F","G","H",
  "I","K","L","M","N","O","P","Q",
  "R","S","T","U","V","W","X","Y",
];
