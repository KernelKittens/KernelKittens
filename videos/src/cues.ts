// Silent motion follows a 120 BPM grid: one four-beat bar is two seconds.
export const beat = (bar: number, beat = 0) => bar * 2 + beat * 0.5;
export const cues = [
  {start: beat(0), end: beat(2), kind: 'identity'},
  {start: beat(2), end: beat(4), kind: 'blackhat'},
  {start: beat(4), end: beat(6), kind: 'kaspersky'},
  {start: beat(6), end: beat(8), kind: 'close'},
] as const;
