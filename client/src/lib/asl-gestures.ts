import fp from "fingerpose";

const { GestureDescription, Finger, FingerCurl, FingerDirection } = fp;

// ── Distinguishable static ASL letters ──
// Only letters with unique curl+direction signatures are included.
// Removed: E/S/T (all fists, thumb placement indistinguishable),
//          O (same half-curl as C), M/N (same fist as A),
//          R/U (same two-fingers-up as V, crossing undetectable).
// J/Z require motion.

// A — fist with thumb up alongside
const aSign = new GestureDescription("A");
aSign.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
aSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
aSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
aSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
aSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);
aSign.addDirection(Finger.Thumb, FingerDirection.VerticalUp, 0.7);

// B — flat hand, all fingers up, thumb tucked
const bSign = new GestureDescription("B");
bSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
bSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
bSign.addCurl(Finger.Ring, FingerCurl.NoCurl, 1.0);
bSign.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);
bSign.addCurl(Finger.Thumb, FingerCurl.FullCurl, 0.6);
bSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7);

// C — curved hand, all fingers half curl, thumb open
const cSign = new GestureDescription("C");
cSign.addCurl(Finger.Index, FingerCurl.HalfCurl, 1.0);
cSign.addCurl(Finger.Middle, FingerCurl.HalfCurl, 1.0);
cSign.addCurl(Finger.Ring, FingerCurl.HalfCurl, 1.0);
cSign.addCurl(Finger.Pinky, FingerCurl.HalfCurl, 1.0);
cSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 0.8);

// D — index up, others curled
const dSign = new GestureDescription("D");
dSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
dSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.9);
dSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
dSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
dSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
dSign.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.6);

// F — index+thumb touch (half curl), middle+ring+pinky up
const fSign = new GestureDescription("F");
fSign.addCurl(Finger.Index, FingerCurl.HalfCurl, 1.0);
fSign.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 1.0);
fSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
fSign.addCurl(Finger.Ring, FingerCurl.NoCurl, 1.0);
fSign.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);
fSign.addDirection(Finger.Middle, FingerDirection.VerticalUp, 0.7);

// G — index pointing horizontally, thumb parallel
const gSign = new GestureDescription("G");
gSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
gSign.addDirection(Finger.Index, FingerDirection.HorizontalLeft, 0.7);
gSign.addDirection(Finger.Index, FingerDirection.HorizontalRight, 0.7);
gSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
gSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
gSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
gSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 0.8);

// H — index+middle pointing horizontally
const hSign = new GestureDescription("H");
hSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
hSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
hSign.addDirection(Finger.Index, FingerDirection.HorizontalLeft, 0.7);
hSign.addDirection(Finger.Index, FingerDirection.HorizontalRight, 0.7);
hSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
hSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
hSign.addCurl(Finger.Thumb, FingerCurl.FullCurl, 0.5);

// I — pinky up only
const iSign = new GestureDescription("I");
iSign.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
iSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
iSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
iSign.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);
iSign.addDirection(Finger.Pinky, FingerDirection.VerticalUp, 0.9);
iSign.addCurl(Finger.Thumb, FingerCurl.FullCurl, 0.5);

// K — index up + middle angled out + thumb out
const kSign = new GestureDescription("K");
kSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
kSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.8);
kSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
kSign.addDirection(Finger.Middle, FingerDirection.DiagonalUpRight, 0.5);
kSign.addDirection(Finger.Middle, FingerDirection.DiagonalUpLeft, 0.5);
kSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
kSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
kSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 0.8);

// L — index up + thumb out (L shape)
const lSign = new GestureDescription("L");
lSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
lSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7);
lSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
lSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
lSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
lSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);
lSign.addDirection(Finger.Thumb, FingerDirection.HorizontalLeft, 0.5);
lSign.addDirection(Finger.Thumb, FingerDirection.HorizontalRight, 0.5);

// P — index+middle pointing down + thumb out
const pSign = new GestureDescription("P");
pSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
pSign.addDirection(Finger.Index, FingerDirection.VerticalDown, 0.7);
pSign.addDirection(Finger.Index, FingerDirection.DiagonalDownLeft, 0.5);
pSign.addDirection(Finger.Index, FingerDirection.DiagonalDownRight, 0.5);
pSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
pSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
pSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
pSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 0.7);

// Q — index pointing down, others curled
const qSign = new GestureDescription("Q");
qSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
qSign.addDirection(Finger.Index, FingerDirection.VerticalDown, 0.8);
qSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
qSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
qSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
qSign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 0.8);
qSign.addDirection(Finger.Thumb, FingerDirection.VerticalDown, 0.5);

// V — index+middle up and spread (peace sign)
const vSign = new GestureDescription("V");
vSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
vSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
vSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
vSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
vSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7);
vSign.addDirection(Finger.Middle, FingerDirection.VerticalUp, 0.7);

// W — index+middle+ring up, pinky curled
const wSign = new GestureDescription("W");
wSign.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
wSign.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
wSign.addCurl(Finger.Ring, FingerCurl.NoCurl, 1.0);
wSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
wSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7);

// X — index hooked (half curl), rest curled
const xSign = new GestureDescription("X");
xSign.addCurl(Finger.Index, FingerCurl.HalfCurl, 1.0);
xSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7);
xSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
xSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
xSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
xSign.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.6);

// Y — thumb+pinky out, rest curled (hang loose)
const ySign = new GestureDescription("Y");
ySign.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
ySign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
ySign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
ySign.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);
ySign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);

// Excluded letters:
// E, S, T — all fists; differ only in thumb placement on/between fingers (undetectable)
// O — same all-half-curl as C; differ only in how tightly closed (undetectable)
// M, N — fists with fingers over thumb; identical curl signature to A
// R, U — two fingers up like V; crossing/spacing undetectable
// J, Z — require motion (not static poses)

export const ASL_GESTURES = [
  aSign, bSign, cSign, dSign, fSign, gSign, hSign,
  iSign, kSign, lSign, pSign, qSign,
  vSign, wSign, xSign, ySign,
];

export const SUPPORTED_LETTERS = [
  "A", "B", "C", "D", "F", "G", "H",
  "I", "K", "L", "P", "Q",
  "V", "W", "X", "Y",
];
