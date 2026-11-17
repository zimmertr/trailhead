// Sound, all of it made in the browser: square and triangle voices and a noise channel, the way
// the consoles of the time did it. Nothing plays until the visitor has clicked or pressed a key.
import { TRACK_NAMES, SET_NAMES } from './content.js';

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const hz = n => { const m = /^([A-G]#?)(\d)$/.exec(n); return m ? 440 * Math.pow(2, (NOTE[m[1]] + (m[2] - 4) * 12 - 9) / 12) : 0; };
// A line of music is written a step at a time: a note name starts a note, a dot holds it, a dash is silence.
const line = s => s.replace(/\|/g, ' ').trim().split(/\s+/);

// Each track: tempo, steps per beat, and one line per voice, all the same length. A tune has two parts:
// the lines on the track itself, and a second part under `b`. One play is the first part, the second,
// and the first again, which makes about a minute.
export const TRACKS = [
  { bpm: 104, div: 2,
    lead: line('E5 - G5 - C6 . B5 A5 | G5 . . D5 G5 . B5 . | A5 . C6 . E6 . D6 C6 | A5 . . F5 A5 . C6 . | E5 - G5 - C6 . D6 E6 | D6 . B5 . G5 . . . | F5 . A5 . C6 . A5 . | G5 . . . . . - -'),
    arp: line('C4 E4 G4 E4 C4 E4 G4 E4 | B3 D4 G4 D4 B3 D4 G4 D4 | A3 C4 E4 C4 A3 C4 E4 C4 | A3 C4 F4 C4 A3 C4 F4 C4 | C4 E4 G4 E4 C4 E4 G4 E4 | B3 D4 G4 D4 B3 D4 G4 D4 | A3 C4 F4 C4 A3 C4 F4 C4 | B3 D4 G4 D4 B3 D4 G4 D4'),
    bass: line('C3 . . . G2 . . . | G2 . . . D3 . . . | A2 . . . E3 . . . | F2 . . . C3 . . . | C3 . . . G2 . . . | G2 . . . D3 . . . | F2 . . . C3 . . . | G2 . . . G2 . D3 .'),
    drum: line('k - h - s - h - | k - h - s - h h | k - h - s - h - | k - h - s - h h | k - h - s - h - | k - h - s - h h | k - h - s - h - | k - h - s s h h'),
    b: { lead: line('A5 . . G5 F5 . A5 . | G5 . . . E5 . C5 . | F5 . . E5 D5 . F5 . | D5 . . . B4 . D5 . | C6 . . B5 A5 . E5 . | A5 . G5 . F5 . C5 . | D5 . F5 . A5 . C6 . | B5 . . . D6 . - -'),
      arp: line('F3 A3 C4 A3 F3 A3 C4 A3 | C4 E4 G4 E4 C4 E4 G4 E4 | D4 F4 A4 F4 D4 F4 A4 F4 | B3 D4 G4 D4 B3 D4 G4 D4 | A3 C4 E4 C4 A3 C4 E4 C4 | A3 C4 F4 C4 A3 C4 F4 C4 | D4 F4 A4 F4 D4 F4 A4 F4 | B3 D4 G4 D4 B3 D4 G4 D4'),
      bass: line('F2 . . . C3 . . . | C3 . . . G2 . . . | D3 . . . A2 . . . | G2 . . . D3 . . . | A2 . . . E3 . . . | F2 . . . C3 . . . | D3 . . . A2 . . . | G2 . . . G2 . B2 .'),
      drum: line('k - h - h - h - | k - h - s - h - | k - h - h - h - | k - h - s - h h | k - h - s - h - | k - h - s - h h | k - h - s - h - | k - s - s s h h') } },
  { bpm: 80, div: 2,
    lead: line('A4 . . . C5 . E5 . | D5 . . . . . C5 . | E5 . . . G5 . E5 . | D5 . . . . . - - | A4 . . . C5 . E5 . | F5 . . . E5 . D5 . | C5 . . . B4 . G4 . | A4 . . . . . - -'),
    arp: line('A3 E4 A4 E4 A3 E4 A4 E4 | F3 C4 F4 C4 F3 C4 F4 C4 | C4 G4 C5 G4 C4 G4 C5 G4 | G3 D4 G4 D4 G3 D4 G4 D4 | A3 E4 A4 E4 A3 E4 A4 E4 | F3 C4 F4 C4 F3 C4 F4 C4 | E3 B3 E4 B3 G3 D4 G4 D4 | A3 E4 A4 E4 A3 E4 A4 E4'),
    bass: line('A2 . . . . . . . | F2 . . . . . . . | C3 . . . . . . . | G2 . . . . . . . | A2 . . . . . . . | F2 . . . . . . . | E2 . . . G2 . . . | A2 . . . . . . .'),
    drum: line('- - - - h - - - | - - - - h - - - | - - - - h - - - | - - - - h - h - | - - - - h - - - | - - - - h - - - | - - - - h - - - | - - - - h - h -'),
    b: { lead: line('C5 . . . A4 . F5 . | E5 . . . . . G5 . | D5 . . . B4 . G5 . | E5 . . . . . - - | F5 . . . A5 . F5 . | E5 . . . C5 . A4 . | C5 . . . D5 . B4 . | B4 . . . . . - -'),
      arp: line('F3 C4 F4 C4 F3 C4 F4 C4 | C4 G4 C5 G4 C4 G4 C5 G4 | G3 D4 G4 D4 G3 D4 G4 D4 | A3 E4 A4 E4 A3 E4 A4 E4 | D4 A4 D5 A4 D4 A4 D5 A4 | A3 E4 A4 E4 A3 E4 A4 E4 | F3 C4 F4 C4 G3 D4 G4 D4 | E3 B3 E4 B3 E3 B3 E4 B3'),
      bass: line('F2 . . . . . . . | C3 . . . . . . . | G2 . . . . . . . | A2 . . . . . . . | D3 . . . . . . . | A2 . . . . . . . | F2 . . . G2 . . . | E2 . . . . . . .'),
      drum: line('- - - - h - - - | - - - - h - - - | - - - - h - - - | - - - - h - h - | - - - - h - - - | - - - - h - - - | - - - - h - - - | - - - - h - h -') } },
  { bpm: 124, div: 2,
    lead: line('D5 - D5 F#5 A5 . F#5 A5 | B5 . A5 . F#5 . D5 . | C5 - C5 E5 G5 . E5 G5 | A5 . G5 . E5 . C5 . | D5 - D5 F#5 A5 . B5 D6 | C6 . B5 . A5 . G5 . | G5 . A5 . B5 . D6 . | A5 . . . . . - -'),
    arp: line('D4 A4 D4 A4 D4 A4 D4 A4 | D4 A4 D4 A4 D4 A4 D4 A4 | C4 G4 C4 G4 C4 G4 C4 G4 | C4 G4 C4 G4 C4 G4 C4 G4 | D4 A4 D4 A4 D4 A4 D4 A4 | C4 G4 C4 G4 C4 G4 C4 G4 | G3 D4 G3 D4 G3 D4 G3 D4 | A3 E4 A3 E4 A3 E4 A3 E4'),
    bass: line('D2 . D3 . D2 . D3 . | D2 . D3 . D2 . A2 . | C2 . C3 . C2 . C3 . | C2 . C3 . C2 . G2 . | D2 . D3 . D2 . D3 . | C2 . C3 . C2 . C3 . | G2 . G2 . G2 . B2 . | A2 . A2 . A2 . C#3 .'),
    drum: line('k - h k s - h - | k - h k s - h h | k - h k s - h - | k - h k s - h h | k - h k s - h - | k - h k s - h h | k - h k s - h - | k k h k s s h h'),
    b: { lead: line('B5 . . . G5 . B5 D6 | D6 . B5 . G5 . . . | A5 . . . F#5 . A5 D6 | D6 . A5 . F#5 . . . | G5 - G5 B5 E6 . B5 G5 | D6 . B5 . G5 . B5 . | A5 . C#6 . E6 . C#6 . | A5 . . . . . - -'),
      arp: line('G3 D4 G3 D4 G3 D4 G3 D4 | G3 D4 G3 D4 G3 D4 G3 D4 | D4 A4 D4 A4 D4 A4 D4 A4 | D4 A4 D4 A4 D4 A4 D4 A4 | E4 B4 E4 B4 E4 B4 E4 B4 | G3 D4 G3 D4 G3 D4 G3 D4 | A3 E4 A3 E4 A3 E4 A3 E4 | A3 E4 A3 E4 A3 E4 A3 E4'),
      bass: line('G2 . G3 . G2 . G3 . | G2 . G3 . G2 . D3 . | D2 . D3 . D2 . D3 . | D2 . D3 . D2 . A2 . | E2 . E3 . E2 . E3 . | G2 . G3 . G2 . G3 . | A2 . A3 . A2 . A3 . | A2 . A3 . A2 . C#3 .'),
      drum: line('k - h k s - h - | k - h k s - h h | k - h k s - h - | k - h k s - h h | k - h k s - h - | k - h k s - h h | k - h k s - h - | k k h k s s h h') } },
  { bpm: 92, div: 2,
    lead: line('B4 . . . E5 . . . | G5 . F#5 . E5 . . . | D5 . . . G5 . . . | B5 . A5 . G5 . . . | A5 . . . G5 . E5 . | F#5 . . . D5 . . . | E5 . G5 . B5 . A5 . | B5 . . . . . - -'),
    arp: line('E4 B4 E5 B4 G4 B4 E5 B4 | E4 B4 E5 B4 G4 B4 E5 B4 | G4 D5 G5 D5 B4 D5 G5 D5 | G4 D5 G5 D5 B4 D5 G5 D5 | A4 E5 A5 E5 C5 E5 A5 E5 | D4 A4 D5 A4 F#4 A4 D5 A4 | E4 B4 E5 B4 G4 B4 E5 B4 | B3 F#4 B4 F#4 D#4 F#4 B4 F#4'),
    bass: line('E2 . . . . . B2 . | E2 . . . . . . . | G2 . . . . . D3 . | G2 . . . . . . . | A2 . . . . . E3 . | D2 . . . . . A2 . | E2 . . . . . . . | B2 . . . . . . .'),
    drum: line('k - - - h - - - | - - h - - - h - | k - - - h - - - | - - h - - - h - | k - - - h - - - | - - h - - - h - | k - - - h - - - | - - h - s - h -'),
    b: { lead: line('G5 . . . E5 . . . | F#5 . A5 . D5 . . . | E5 . . . B4 . . . | G5 . F#5 . E5 . . . | C6 . . . G5 . E5 . | A5 . . . F#5 . D5 . | B4 . D#5 . F#5 . B5 . | F#5 . . . . . - -'),
      arp: line('C4 G4 C5 G4 E4 G4 C5 G4 | D4 A4 D5 A4 F#4 A4 D5 A4 | E4 B4 E5 B4 G4 B4 E5 B4 | E4 B4 E5 B4 G4 B4 E5 B4 | C4 G4 C5 G4 E4 G4 C5 G4 | D4 A4 D5 A4 F#4 A4 D5 A4 | B3 F#4 B4 F#4 D#4 F#4 B4 F#4 | B3 F#4 B4 F#4 D#4 F#4 B4 F#4'),
      bass: line('C3 . . . . . G2 . | D3 . . . . . A2 . | E2 . . . . . B2 . | E2 . . . . . . . | C3 . . . . . G2 . | D3 . . . . . A2 . | B2 . . . . . F#2 . | B2 . . . . . . .'),
      drum: line('k - - - h - - - | - - h - - - h - | k - - - h - - - | - - h - - - h - | k - - - h - - - | - - h - - - h - | k - - - h - - - | - - h - s - h -') } },
  { bpm: 132, div: 2,
    lead: line('G5 G5 - E5 G5 . A5 . | G5 . E5 . C5 . D5 . | E5 E5 - C5 E5 . F5 . | E5 . D5 . G4 . - - | G5 G5 - E5 G5 . A5 . | C6 . B5 . A5 . G5 . | F5 . E5 . D5 . B4 . | C5 . . . . . - -'),
    arp: line('C4 G4 E4 G4 C4 G4 E4 G4 | C4 G4 E4 G4 C4 G4 E4 G4 | A3 E4 C4 E4 A3 E4 C4 E4 | G3 D4 B3 D4 G3 D4 B3 D4 | C4 G4 E4 G4 C4 G4 E4 G4 | F3 C4 A3 C4 F3 C4 A3 C4 | D4 A4 F4 A4 G3 D4 B3 D4 | C4 G4 E4 G4 C4 G4 E4 G4'),
    bass: line('C3 . G2 . C3 . G2 . | C3 . G2 . C3 . G2 . | A2 . E2 . A2 . E2 . | G2 . D2 . G2 . D2 . | C3 . G2 . C3 . G2 . | F2 . C2 . F2 . C2 . | D2 . A2 . G2 . D2 . | C3 . G2 . C3 . . .'),
    drum: line('k - s - k k s - | k - s - k k s h | k - s - k k s - | k - s - k k s h | k - s - k k s - | k - s - k k s h | k - s - k k s - | k - s - s s s -'),
    b: { lead: line('A5 A5 - F5 A5 . C6 . | G5 . E5 . C5 . E5 . | A5 A5 - F5 A5 . C6 . | B5 . G5 . D5 . - - | C6 C6 - A5 C6 . E6 . | C6 . A5 . F5 . A5 . | D5 . F5 . A5 . D6 . | B5 . . . G5 . - -'),
      arp: line('F3 C4 A3 C4 F3 C4 A3 C4 | C4 G4 E4 G4 C4 G4 E4 G4 | F3 C4 A3 C4 F3 C4 A3 C4 | G3 D4 B3 D4 G3 D4 B3 D4 | A3 E4 C4 E4 A3 E4 C4 E4 | F3 C4 A3 C4 F3 C4 A3 C4 | D4 A4 F4 A4 D4 A4 F4 A4 | G3 D4 B3 D4 G3 D4 B3 D4'),
      bass: line('F2 . C2 . F2 . C2 . | C3 . G2 . C3 . G2 . | F2 . C2 . F2 . C2 . | G2 . D2 . G2 . D2 . | A2 . E2 . A2 . E2 . | F2 . C2 . F2 . C2 . | D2 . A2 . D2 . A2 . | G2 . D2 . G2 . . .'),
      drum: line('k - s - k k s - | k - s - k k s h | k - s - k k s - | k - s - k k s h | k - s - k k s - | k - s - k k s h | k - s - k k s - | k - s - s s s -') } },
  { bpm: 72, div: 2,
    lead: line('F#5 . . A5 . . D6 . | B5 . . . F#5 . D5 . | G5 . . B5 . . D6 . | C#6 . . . A5 . E5 . | F#5 . A5 . D6 . F#6 . | D6 . . . B5 . F#5 . | G5 . B5 . A5 . C#6 . | D6 . . . . . - -'),
    arp: line('D4 A4 F#4 A4 D4 A4 F#4 A4 | B3 F#4 D4 F#4 B3 F#4 D4 F#4 | G3 D4 B3 D4 G3 D4 B3 D4 | A3 E4 C#4 E4 A3 E4 C#4 E4 | D4 A4 F#4 A4 D4 A4 F#4 A4 | B3 F#4 D4 F#4 B3 F#4 D4 F#4 | G3 D4 B3 D4 A3 E4 C#4 E4 | D4 A4 F#4 A4 D4 A4 F#4 A4'),
    bass: line('D3 . . . . . A2 . | B2 . . . . . F#2 . | G2 . . . . . D3 . | A2 . . . . . E3 . | D3 . . . . . A2 . | B2 . . . . . F#2 . | G2 . . . A2 . . . | D3 . . . . . . .'),
    drum: line('- - - - h - - - | - - - - h - - - | - - - - h - - - | - - - - h - h - | - - - - h - - - | - - - - h - - - | - - - - h - - - | h - - - h - h -'),
    b: { lead: line('B5 . . D6 . . G5 . | A5 . . . F#5 . D5 . | G5 . . B5 . . E5 . | C#6 . . . A5 . E5 . | D6 . B5 . F#5 . B5 . | G5 . . . B5 . D6 . | E6 . D6 . B5 . G5 . | A5 . . . . . - -'),
      arp: line('G3 D4 B3 D4 G3 D4 B3 D4 | D4 A4 F#4 A4 D4 A4 F#4 A4 | E4 B4 G4 B4 E4 B4 G4 B4 | A3 E4 C#4 E4 A3 E4 C#4 E4 | B3 F#4 D4 F#4 B3 F#4 D4 F#4 | G3 D4 B3 D4 G3 D4 B3 D4 | E4 B4 G4 B4 E4 B4 G4 B4 | A3 E4 C#4 E4 A3 E4 C#4 E4'),
      bass: line('G2 . . . . . D3 . | D3 . . . . . A2 . | E2 . . . . . B2 . | A2 . . . . . E3 . | B2 . . . . . F#2 . | G2 . . . . . D3 . | E2 . . . . . B2 . | A2 . . . . . . .'),
      drum: line('- - - - h - - - | - - - - h - - - | - - - - h - - - | - - - - h - h - | - - - - h - - - | - - - - h - - - | - - - - h - - - | h - - - h - h -') } },
  { bpm: 140, div: 2,
    lead: line('A5 - C#6 - E6 . C#6 A5 | B5 . A5 . E5 . . . | F#5 - A5 - D6 . A5 F#5 | G#5 . B5 . E6 . . . | A5 - C#6 - E6 . A6 . | F#6 . E6 . C#6 . A5 . | D6 . F#6 . E6 . G#5 . | A5 . . . . . - -'),
    arp: line('A3 E4 A3 E4 A3 E4 A3 E4 | A3 E4 A3 E4 A3 E4 A3 E4 | D4 A4 D4 A4 D4 A4 D4 A4 | E4 B4 E4 B4 E4 B4 E4 B4 | A3 E4 A3 E4 A3 E4 A3 E4 | F#3 C#4 F#3 C#4 F#3 C#4 F#3 C#4 | D4 A4 D4 A4 E4 B4 E4 B4 | A3 E4 A3 E4 A3 E4 A3 E4'),
    bass: line('A2 . A3 . A2 . A3 . | A2 . A3 . A2 . A3 . | D2 . D3 . D2 . D3 . | E2 . E3 . E2 . E3 . | A2 . A3 . A2 . A3 . | F#2 . F#3 . F#2 . F#3 . | D2 . D3 . E2 . E3 . | A2 . A3 . A2 . . .'),
    drum: line('k - h - s - h - | k - h h s - h - | k - h - s - h - | k - h h s - h h | k - h - s - h - | k - h h s - h - | k - h - s - h - | k - s - s s s -'),
    b: { lead: line('F#5 - A5 - D6 . A5 F#5 | A5 . F#5 . D5 . . . | E5 - A5 - C#6 . A5 E5 | C#6 . A5 . E5 . . . | D6 - F#6 - B5 . D6 . | A5 . F#5 . D6 . A5 . | G#5 . B5 . E6 . B5 . | E6 . . . . . - -'),
      arp: line('D4 A4 D4 A4 D4 A4 D4 A4 | D4 A4 D4 A4 D4 A4 D4 A4 | A3 E4 A3 E4 A3 E4 A3 E4 | A3 E4 A3 E4 A3 E4 A3 E4 | B3 F#4 B3 F#4 B3 F#4 B3 F#4 | D4 A4 D4 A4 D4 A4 D4 A4 | E4 B4 E4 B4 E4 B4 E4 B4 | E4 B4 E4 B4 E4 B4 E4 B4'),
      bass: line('D2 . D3 . D2 . D3 . | D2 . D3 . D2 . D3 . | A2 . A3 . A2 . A3 . | A2 . A3 . A2 . A3 . | B2 . B3 . B2 . B3 . | D2 . D3 . D2 . D3 . | E2 . E3 . E2 . E3 . | E2 . E3 . E2 . G#2 .'),
      drum: line('k - h - s - h - | k - h h s - h - | k - h - s - h - | k - h h s - h h | k - h - s - h - | k - h h s - h - | k - h - s - h - | k - s - s s s -') } }
];

// The same notes through three different instruments. A set names the wave each voice uses, how
// loud the drums are, and how the effects are pitched.
export const SETS = [
  { lead: 'square', arp: 'square', bass: 'triangle', fx: { square: 'square', triangle: 'triangle' }, drums: 1, pitch: 1 },
  { lead: 'pulse', arp: 'pulse', bass: 'square', fx: { square: 'pulse', triangle: 'triangle' }, drums: 0.7, pitch: 1.5, bassVol: 0.4 },
  { lead: 'sine', arp: 'triangle', bass: 'sine', fx: { square: 'sine', triangle: 'sine' }, drums: 0, pitch: 2, pluck: true, octave: 2 }
];

// Their names are words on the page, so they live with the rest of the words.
TRACKS.forEach((tr, i) => { tr.name = TRACK_NAMES[i]; }); SETS.forEach((st, i) => { st.name = SET_NAMES[i]; });

// Which tunes belong to which place, the first one first. Glissade is the walk back out. The walk to
// camp keeps Wildflower Meadow over its flower slope; camp opens with Above the Icefall, since Larch
// March now belongs to the larch basin.
const PLACES = { world: [0, 4], out: [6, 0], forest: [1, 5], lakeside: [5, 1], larches: [4, 5], wall: [2, 4], approach: [0, 3], camp: [3, 4], climb: [3, 6], offroute: [3] };

export function makeAudio() {
  let ctx = null, master, music, tone0, fx, amb, noiseBuf, muted = false, timer = null, step = 0, nextAt = 0, cur = 0, set = 0, auto = true, place = 'world', turn = 0, loops = 0, level = 0.22, swap = null, pulse = null, ambName = '', ambNodes = [], ambTimer = null;
  // The music follows the place unless the visitor has picked a track by hand, and a pick is kept between visits.
  try { muted = localStorage.getItem('trailhead.muted') === '1'; const own = localStorage.getItem('trailhead.track'); if (own != null && TRACKS[+own]) { auto = false; cur = +own; } const v = +localStorage.getItem('trailhead.set'); if (SETS[v]) set = v; } catch { /* private window */ }

  function start() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    // The page shows whether sound is running yet, so it is told when that changes.
    ctx.onstatechange = () => { if (out.onchange) out.onchange(); };
    // Everything meets at one gain, with a limiter after it so a pile-up of effects cannot clip.
    const limit = ctx.createDynamicsCompressor(); limit.threshold.value = -9; limit.ratio.value = 8; limit.attack.value = 0.003; limit.release.value = 0.2; limit.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(limit);
    // The music passes a filter that closes while a sheet is open, and fades in rather than starting flat out.
    tone0 = ctx.createBiquadFilter(); tone0.type = 'lowpass'; tone0.frequency.value = 16000; tone0.connect(master);
    music = ctx.createGain(); music.gain.setValueAtTime(0.0001, ctx.currentTime); music.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 1.8); music.connect(tone0);
    fx = ctx.createGain(); fx.gain.value = 0.5; fx.connect(master);
    // The echo of a cartridge: one short delay fed back into itself, darker on every pass.
    { const d = ctx.createDelay(0.5), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), wet = ctx.createGain(), send = ctx.createGain(); d.delayTime.value = 0.19; fb.gain.value = 0.34; lp.type = 'lowpass'; lp.frequency.value = 2600; wet.gain.value = 0.2; send.gain.value = 0.6; music.connect(d); fx.connect(send); send.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(master); }
    amb = ctx.createGain(); amb.gain.value = 0.25; amb.connect(master);
    // A narrow pulse wave (a quarter on, three quarters off): the reedy voice of a handheld.
    { const n = 32, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) { re[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * 0.25); im[k] = 2 / (k * Math.PI) * (1 - Math.cos(k * Math.PI * 0.25)); } pulse = ctx.createPeriodicWave(re, im); }
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); let s = 1; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
    nextAt = ctx.currentTime + 0.1;
    timer = setInterval(schedule, 90);
    if (ambName) ambience(ambName, true);
  }
  // Changes the tune without a jolt: the one playing fades out, the next starts from its top and fades in.
  function fadeTo(i, quick) {
    loops = 0; if (i === cur && swap == null) return;
    if (!ctx) { cur = i; return; }
    const first = swap == null; swap = i; if (!first) return;
    music.gain.cancelScheduledValues(ctx.currentTime); music.gain.setTargetAtTime(0.0001, ctx.currentTime, quick ? 0.06 : 0.3);
    setTimeout(() => { cur = swap; swap = null; step = 0; if (out.onchange) out.onchange(); nextAt = Math.max(nextAt, ctx.currentTime + 0.05); music.gain.cancelScheduledValues(ctx.currentTime); music.gain.setTargetAtTime(level, ctx.currentTime, quick ? 0.12 : 0.5); }, quick ? 220 : 1100);
  }
  // One note: a square, pulse or triangle wave with a quick attack and a falling tail.
  function tone(out, type, f0, t, dur, vol, f1) {
    if (!f0) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), V = SETS[set];
    // Effects are written for the console; the other sets play them through their own voice.
    if (out === fx) { type = V.fx[type] || type; f0 *= V.pitch; if (f1) f1 *= V.pitch; if (type === 'sine') vol *= 1.5; }
    if (type === 'pulse') { o.setPeriodicWave(pulse); vol *= 0.8; } else o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (V.pluck && out === music) { dur = Math.max(dur, 0.5); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * 1.6, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    else { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.setValueAtTime(vol, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
    return o;
  }
  function noise(out, t, dur, vol, freq = 4000, q = 0.7, type = 'highpass') {
    const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = noiseBuf; n.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(out); n.start(t, Math.random()); n.stop(t + dur + 0.02);
  }
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    const tr = TRACKS[cur], dt = 60 / tr.bpm / tr.div, len = tr.lead.length;
    while (nextAt < ctx.currentTime + 0.25) {
      // sec: which third of a play this is. pass: how many plays of this tune have gone by.
      const sec = Math.floor(step / len) % 3, pass = Math.floor(step / (len * 3)), P = sec === 1 ? tr.b : tr;
      const i = step % len, hold = (l, k) => { let n = 1; while (l[(k + n) % len] === '.' && n < 16) n++; return n; };
      const V = SETS[set], up = V.octave || 1, dv = V.drums;
      const a = P.lead[i]; if (a !== '.' && a !== '-') {
        const n = hold(P.lead, i), o = tone(music, V.lead, hz(a) * up, nextAt, dt * n * 0.95, 0.16);
        // When the first part comes back the melody is doubled an octave down, so the return sounds fuller than the start.
        if (sec === 2) tone(music, V.lead, hz(a) * up / 2, nextAt, dt * n * 0.95, 0.06);
        // A held note gets a little vibrato once it has settled.
        if (o && n >= 3 && !V.pluck) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.6; lg.gain.setValueAtTime(0, nextAt + dt); lg.gain.linearRampToValueAtTime(hz(a) * up * 0.007, nextAt + dt * 2); l.connect(lg); lg.connect(o.frequency); l.start(nextAt); l.stop(nextAt + dt * n); }
      }
      const b = P.arp[i]; if (b !== '.' && b !== '-') tone(music, V.arp, hz(b) * up, nextAt, dt * 0.8, V.arp === 'square' ? 0.045 : 0.07);
      const c = P.bass[i]; if (c !== '.' && c !== '-') tone(music, V.bass, hz(c) * up, nextAt, dt * hold(P.bass, i) * 0.9, V.bass === 'square' ? 0.1 : 0.3);
      // On every second play the drums sit out the first four bars, so a tune does not come round the same way twice.
      const dr = pass % 2 === 1 && sec === 0 && i < len / 2 ? '-' : P.drum[i]; if (!dv) { /* no drums in a music box */ } else if (dr === 'k') tone(music, 'triangle', 150, nextAt, 0.12, 0.4 * dv, 45); else if (dr === 's') noise(music, nextAt, 0.11, 0.16 * dv, 1800, 0.6, 'bandpass'); else if (dr === 'h') noise(music, nextAt, 0.035, 0.05 * dv, 7000);
      step++; nextAt += dt;
      // After two plays of a tune, Auto moves on: the place's own tunes first, then every other one, and round again.
      // A tune picked by hand stays.
      if (step % (len * 3) === 0 && auto && ++loops >= 2) { turn++; const order = [...PLACES[place], ...TRACKS.map((_, k) => k).filter(k => !PLACES[place].includes(k))]; fadeTo(order[turn % order.length]); }
    }
  }

  // The effects. Each is a handful of notes.
  const FX = {
    select: t => { tone(fx, 'square', 660, t, 0.06, 0.2); tone(fx, 'square', 990, t + 0.05, 0.09, 0.2); },
    open: t => { tone(fx, 'square', 523, t, 0.05, 0.16); tone(fx, 'square', 659, t + 0.05, 0.05, 0.16); tone(fx, 'square', 784, t + 0.1, 0.1, 0.16); },
    close: t => { tone(fx, 'square', 659, t, 0.05, 0.14); tone(fx, 'square', 440, t + 0.05, 0.08, 0.14); },
    stop: t => { tone(fx, 'triangle', 392, t, 0.09, 0.4); tone(fx, 'triangle', 587, t + 0.08, 0.16, 0.4); },
    iris: t => { noise(fx, t, 0.3, 0.14, 900, 2, 'bandpass'); tone(fx, 'triangle', 300, t, 0.3, 0.2, 90); },
    hop: t => tone(fx, 'square', 280, t, 0.16, 0.2, 760),
    jump: t => tone(fx, 'square', 220, t, 0.26, 0.22, 880),
    splash: t => { noise(fx, t, 0.5, 0.3, 1400, 0.8, 'bandpass'); tone(fx, 'triangle', 500, t, 0.2, 0.2, 120); },
    whistle: t => { tone(fx, 'square', 2100, t, 0.16, 0.12, 2500); tone(fx, 'square', 2100, t + 0.2, 0.16, 0.12, 2500); },
    eep: t => tone(fx, 'square', 1800, t, 0.09, 0.14, 2400),
    fall: t => { tone(fx, 'square', 900, t, 0.3, 0.2, 140); noise(fx, t, 0.1, 0.12, 2400, 1, 'bandpass'); },
    catch: t => { tone(fx, 'triangle', 110, t, 0.2, 0.5, 70); tone(fx, 'square', 330, t + 0.12, 0.08, 0.14); },
    place: t => { noise(fx, t, 0.03, 0.14, 5000); tone(fx, 'square', 1400, t + 0.02, 0.04, 0.1); },
    glow: t => { tone(fx, 'square', 1320, t, 0.05, 0.08); tone(fx, 'square', 1760, t + 0.04, 0.08, 0.08); },
    flag: t => [523, 659, 784, 1047].forEach((f, i) => tone(fx, 'square', f, t + i * 0.09, i === 3 ? 0.34 : 0.09, 0.2)),
    summit: t => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => { tone(fx, 'square', f, t + i * 0.08, i === 5 ? 0.5 : 0.09, 0.2); tone(fx, 'triangle', f / 2, t + i * 0.08, 0.12, 0.3); }),
    glissade: t => { noise(fx, t, 2.2, 0.2, 2600, 0.5, 'bandpass'); tone(fx, 'triangle', 700, t, 2.1, 0.1, 180); },
    // Meltwater under the moraine: a few quick bubbles of running water.
    gurgle: t => { for (let i = 0; i < 4; i++) { const d = i * 0.07 + Math.random() * 0.05; noise(fx, t + d, 0.09, 0.05, 900 + Math.random() * 700, 4, 'bandpass'); tone(fx, 'sine', 420 + Math.random() * 380, t + d, 0.07, 0.05, 700 + Math.random() * 500); } },
    // The glacier settling: a deep, slow groan with a crack in it, far off.
    creak: t => { tone(fx, 'sawtooth', 70, t, 0.9, 0.05, 52); noise(fx, t + 0.5, 0.25, 0.08, 260, 1, 'lowpass'); },
    crack: t => { noise(fx, t, 0.35, 0.3, 500, 1, 'lowpass'); tone(fx, 'square', 160, t, 0.2, 0.18, 60); },
    wind: t => noise(fx, t, 1.4, 0.12, 700, 1.4, 'bandpass'),
    // The same whoosh high on the West Ridge: louder, longer and lower.
    windHi: t => { noise(fx, t, 2.2, 0.26, 520, 1.1, 'bandpass'); noise(fx, t + 0.3, 1.6, 0.12, 1100, 2, 'bandpass'); },
    egg: t => [784, 988, 1175, 1568].forEach((f, i) => tone(fx, 'square', f, t + i * 0.06, 0.1, 0.16)),
    meow: t => { tone(fx, 'square', 620, t, 0.12, 0.16, 940); tone(fx, 'square', 940, t + 0.12, 0.2, 0.16, 520); },
    purr: t => { for (let i = 0; i < 14; i++) tone(fx, 'triangle', 52, t + i * 0.045, 0.03, 0.5); },
    chirp: t => { tone(fx, 'square', 2600, t, 0.05, 0.07, 3400); tone(fx, 'square', 3000, t + 0.08, 0.05, 0.07, 2400); },
    bark: t => noise(fx, t, 0.2, 0.2, 300, 1, 'lowpass'),
    // A Clark's nutcracker in the larches: a harsh, drawn-out kraa, twice.
    kraa: t => { for (let i = 0; i < 2; i++) { noise(fx, t + i * 0.3, 0.22, 0.1, 1300, 4, 'bandpass'); tone(fx, 'square', 520, t + i * 0.3, 0.2, 0.03, 430); } },
    step: t => noise(fx, t, 0.02, 0.05, 1200, 1, 'bandpass'),
    // An ice tool biting: a short bright tick. And the server rack being hit: a low thump, a crunch and a ring of sheet metal.
    // Two hands meeting.
    slap: t => { noise(fx, t, 0.035, 0.26, 2200, 1.1, 'bandpass'); noise(fx, t, 0.02, 0.1, 5200, 2, 'bandpass'); },
    // A sports watch: two short high beeps.
    beep: t => { tone(fx, 'square', 2100, t, 0.07, 0.04, 2100); tone(fx, 'square', 2100, t + 0.14, 0.07, 0.04, 2100); },
    tink: t => { noise(fx, t, 0.02, 0.09, 6200, 3, 'bandpass'); tone(fx, 'square', 2400, t, 0.03, 0.05, 1900); },
    bang: t => { tone(fx, 'triangle', 150, t, 0.3, 0.7, 42); noise(fx, t, 0.16, 0.4, 320, 0.8, 'lowpass'); noise(fx, t + 0.01, 0.07, 0.2, 2600, 2, 'bandpass'); tone(fx, 'square', 520, t + 0.03, 0.2, 0.08, 470); },
    // Ice breaking far off: a long low roll, a second wave of it, and a deep note under both (E4).
    rumble: t => { noise(fx, t, 1.8, 0.22, 150, 0.7, 'lowpass'); noise(fx, t + 0.25, 1.2, 0.12, 420, 0.8, 'lowpass'); tone(fx, 'triangle', 58, t, 1.4, 0.16, 36); },
    // The avalanche (E5c): a longer, deeper roll than a serac's, building and dying away.
    avalanche: t => { noise(fx, t, 4.5, 0.3, 110, 0.7, 'lowpass'); noise(fx, t + 0.4, 3.4, 0.16, 300, 0.8, 'lowpass'); tone(fx, 'triangle', 44, t, 3.8, 0.2, 28); },
    locked: t => { tone(fx, 'square', 180, t, 0.08, 0.16); tone(fx, 'square', 150, t + 0.09, 0.12, 0.16); },
    unlock: t => [659, 784, 988, 1319].forEach((f, i) => tone(fx, 'triangle', f, t + i * 0.07, 0.14, 0.4))
  };

  // A bed of sound under each scene: wind, water, and now and then a bird.
  function ambience(name, force) {
    if (name === ambName && !force) return; ambName = name;
    if (!ctx) return;
    for (const n of ambNodes) { try { n.stop(); } catch { /* already stopped */ } } ambNodes = []; clearInterval(ambTimer);
    const bed = (freq, q, vol, type = 'bandpass') => { const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain(); n.buffer = noiseBuf; n.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol; l.frequency.value = 0.13; lg.gain.value = vol * 0.5; l.connect(lg); lg.connect(g.gain); n.connect(f); f.connect(g); g.connect(amb); n.start(); l.start(); ambNodes.push(n, l); };
    if (name === 'forest') { bed(2400, 0.4, 0.12); bed(500, 0.6, 0.06); }
    else if (name === 'lakeside') { bed(900, 0.5, 0.07); bed(3000, 0.3, 0.03); }
    else if (name === 'wall') bed(500, 1.2, 0.1);
    // The larch basin: wind over open granite and the cascade below the tarn, far off.
    else if (name === 'larches') { bed(650, 1, 0.09); bed(2800, 0.6, 0.025); }
    // The walk to camp: wind on the open slope, and the river far below in the valley.
    else if (name === 'approach') { bed(700, 0.9, 0.09); bed(1300, 0.4, 0.02); }
    else if (name === 'camp' || name === 'climb' || name === 'offroute') { bed(420, 1.6, 0.2); bed(1500, 0.8, 0.05); }
    else bed(1800, 0.3, 0.03);
    if (name === 'world' || name === 'forest' || name === 'lakeside') ambTimer = setInterval(() => { if (ctx.state === 'running' && Math.random() < 0.5) FX.chirp(ctx.currentTime + Math.random() * 0.5); }, 2600);
    // Up in the basin no songbirds: now and then the pika eeps from its rocks (a hint that it is there) or a nutcracker calls.
    else if (name === 'larches') ambTimer = setInterval(() => { const r = Math.random(); if (ctx.state === 'running' && r < 0.35) FX[r < 0.2 ? 'eep' : 'kraa'](ctx.currentTime + Math.random() * 0.5); }, 3200);
  }

  const out = {
    start,
    sfx(name) { if (!ctx || muted || !FX[name]) return; try { FX[name](ctx.currentTime + 0.005); } catch (e) { /* a sound is never worth an error */ } },
    ambience,
    muted: () => muted,
    // Whether anything can be heard yet: a browser holds the sound back until the first click, tap or key.
    live: () => !!ctx && ctx.state === 'running',
    setMuted(m) { muted = !!m; if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05); try { localStorage.setItem('trailhead.muted', muted ? '1' : '0'); } catch { /* private window */ } },
    track: () => ({ index: swap == null ? cur : swap, name: TRACKS[swap == null ? cur : swap].name, count: TRACKS.length, auto }),
    // The scene has changed: in Auto the music changes with it.
    place(name) { if (!PLACES[name] || name === place) return; place = name; turn = 0; if (auto) fadeTo(PLACES[name][0]); },
    // The track button: Auto, then each track in turn, then Auto again. A track picked here stays until Auto comes round.
    cycle() { const at = swap == null ? cur : swap; if (auto) { auto = false; fadeTo(0, true); } else if (at + 1 >= TRACKS.length) { auto = true; fadeTo(PLACES[place][0], true); } else fadeTo(at + 1, true); try { if (auto) localStorage.removeItem('trailhead.track'); else localStorage.setItem('trailhead.track', String(swap == null ? cur : swap)); } catch { /* private window */ } },
    set: () => ({ index: set, name: SETS[set].name, count: SETS.length }),
    setSet(i) { set = ((i % SETS.length) + SETS.length) % SETS.length; try { localStorage.setItem('trailhead.set', String(set)); } catch { /* private window */ } return SETS[set].name; },
    // How much the music steps back: 0 out in the world, 1 while a card is being read, 2 under a sheet.
    focus(lv) { if (!music) return; level = [0.22, 0.15, 0.13][lv] || 0.22; if (swap == null) { music.gain.cancelScheduledValues(ctx.currentTime); music.gain.setTargetAtTime(level, ctx.currentTime, 0.25); } tone0.frequency.setTargetAtTime(lv === 2 ? 900 : 16000, ctx.currentTime, 0.2); }
  };
  return out;
}
