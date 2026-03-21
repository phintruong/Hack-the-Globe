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

// I — pinky up, rest curled
const iSign = new GestureDescription("I");
iSign.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
iSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
iSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
iSign.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);
iSign.addDirection(Finger.Pinky, FingerDirection.VerticalUp, 0.9);
iSign.addCurl(Finger.Thumb, FingerCurl.FullCurl, 0.5);

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

// O — all fingers curled to touch thumb
const oSign = new GestureDescription("O");
oSign.addCurl(Finger.Index, FingerCurl.HalfCurl, 0.8);
oSign.addCurl(Finger.Middle, FingerCurl.HalfCurl, 0.8);
oSign.addCurl(Finger.Ring, FingerCurl.HalfCurl, 0.8);
oSign.addCurl(Finger.Pinky, FingerCurl.HalfCurl, 0.8);
oSign.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.8);

// V — index + middle up, rest curled
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

// Y — thumb + pinky out, rest curled
const ySign = new GestureDescription("Y");
ySign.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
ySign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
ySign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
ySign.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);
ySign.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);

export const ASL_GESTURES = [
  aSign,
  bSign,
  cSign,
  dSign,
  iSign,
  lSign,
  oSign,
  vSign,
  wSign,
  ySign,
];
