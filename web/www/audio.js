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

// The same notes through six different sets of instruments. A set names the wave each voice uses, how
// loud the drums are, and how the effects are pitched.
// level and fxVol even the sets out (round 8, I4), by the audio lab's numbers (tools/pixel/sound.sh). level is
// how much the set's music is turned up so that all six play a tune at one loudness. fxVol is how loud an
// effect's square and triangle notes play through the set's own voices, so that an effect is as loud
// whichever set is on. tunes: struck bars ring for a fixed time, so a busy tune comes out louder through the
// mallets than a slow one; these put its seven tunes level with each other.
export const SETS = [
  { lead: 'square', arp: 'square', bass: 'triangle', fx: { square: 'square', triangle: 'triangle' }, drums: 1, pitch: 1 },
  { lead: 'pulse', arp: 'pulse', bass: 'square', fx: { square: 'pulse', triangle: 'triangle' }, drums: 0.7, pitch: 1.5, bassVol: 0.4, level: 2.16, fxVol: { square: 2.63 } },
  { lead: 'sine', arp: 'triangle', bass: 'sine', fx: { square: 'sine', triangle: 'sine' }, drums: 0, pitch: 2, pluck: true, octave: 2, level: 1.46, fxVol: { square: 0.73, triangle: 0.45 } },
  // Round 8, E3 (TJ: drums and percussion, strings, woodwinds). The same notes again, each through voices
  // that are built from more than one wave (voice() below). perc: a shaker, a woodblock and toms join the
  // drums. still: no vibrato on a held note, since a struck bar has none.
  { lead: 'mallet', arp: 'mallet', bass: 'tom', fx: { square: 'triangle', triangle: 'triangle' }, drums: 1.2, pitch: 1, perc: true, still: true, level: 1.68, tunes: [0.99, 1.23, 0.86, 1.11, 0.81, 1.11, 0.94], fxVol: { square: 1.57 } },
  { lead: 'bow', arp: 'pizz', bass: 'bow', fx: { square: 'triangle', triangle: 'sine' }, drums: 0, pitch: 1, level: 1.84, fxVol: { square: 1.57, triangle: 0.55 } },
  { lead: 'flute', arp: 'reed', bass: 'bassoon', fx: { square: 'sine', triangle: 'sine' }, drums: 0.35, pitch: 1.5, level: 1.36, fxVol: { square: 0.78, triangle: 0.49 } }
];
// How loud each built voice plays beside the plain waves, so the six sets sit at one level.
const VOICES = { mallet: 1.5, tom: 1.3, bow: 0.9, pizz: 1.7, flute: 1.1, reed: 0.5, bassoon: 0.42 };

// Their names are words on the page, so they live with the rest of the words.
TRACKS.forEach((tr, i) => { tr.name = TRACK_NAMES[i]; }); SETS.forEach((st, i) => { st.name = SET_NAMES[i]; });

// Which tunes belong to which place, the first one first. Glissade is the walk back out. The walk to
// camp keeps Wildflower Meadow over its flower slope; camp opens with Above the Icefall, since Larch
// March now belongs to the larch basin.
const PLACES = { world: [0, 4], out: [6, 0], forest: [1, 5], lakeside: [5, 1], larches: [4, 5], wall: [2, 4], approach: [0, 3], camp: [3, 4], climb: [3, 6], offroute: [3] };
// Which set of instruments plays where while the music style is on Auto (round 8, H14): winds in the
// rainforest, the quartet at the lake, mallets on the ridge, and the music box at camp once it is Dusk.
// Anywhere else it is the first set. The numbers are places in SETS.
const PLACE_SETS = { forest: 5, lakeside: 4, wall: 3 }, CAMP_AT_DUSK = 2;

export function makeAudio() {
  let ctx = null, master, music, trim, tone0, fx, amb, noiseBuf, muted = false, step = 0, nextAt = 0, cur = 0, set = 0, ownSet = null, dark = false, auto = true, place = 'world', turn = 0, loops = 0, level = 0.22, swap = null, pulse = null, ambName = '', ambNodes = [], ambTimer = null, rainG = null, rainK = 0;
  // The music follows the place unless the visitor has picked a track by hand, and a pick is kept between visits.
  try { muted = localStorage.getItem('trailhead.muted') === '1'; const own = localStorage.getItem('trailhead.track'); if (own != null && TRACKS[+own]) { auto = false; cur = +own; } const v = localStorage.getItem('trailhead.set'); if (v != null && SETS[+v]) set = ownSet = +v; } catch { /* private window */ }

  // held: the sound was running when the page went out of sight, and is waiting for it to come back.
  let held = false;
  function start() {
    if (ctx) { held = false; if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    // The page shows whether sound is running yet, so it is told when that changes.
    ctx.onstatechange = () => { if (out.onchange) out.onchange(); };
    // Everything meets at one gain, with a limiter after it so a pile-up of effects cannot clip.
    const limit = ctx.createDynamicsCompressor(); limit.threshold.value = -9; limit.ratio.value = 8; limit.attack.value = 0.003; limit.release.value = 0.2; limit.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(limit);
    // The music passes a filter that closes while a sheet is open, and fades in rather than starting flat out.
    tone0 = ctx.createBiquadFilter(); tone0.type = 'lowpass'; tone0.frequency.value = 16000; tone0.connect(master);
    music = ctx.createGain(); music.gain.setValueAtTime(0.0001, ctx.currentTime); music.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 1.8);
    // Each set's own level (I4), after the fades, so a fade is the same for every set.
    trim = ctx.createGain(); trim.gain.value = trimOf(); music.connect(trim); trim.connect(tone0);
    fx = ctx.createGain(); fx.gain.value = 0.5; fx.connect(master);
    // The echo of a cartridge: one short delay fed back into itself, darker on every pass.
    { const d = ctx.createDelay(0.5), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), wet = ctx.createGain(), send = ctx.createGain(); d.delayTime.value = 0.19; fb.gain.value = 0.34; lp.type = 'lowpass'; lp.frequency.value = 2600; wet.gain.value = 0.2; send.gain.value = 0.6; trim.connect(d); fx.connect(send); send.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(master); }
    amb = ctx.createGain(); amb.gain.value = 0.25; amb.connect(master);
    // A narrow pulse wave (a quarter on, three quarters off): the reedy voice of a handheld.
    { const n = 32, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) { re[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * 0.25); im[k] = 2 / (k * Math.PI) * (1 - Math.cos(k * Math.PI * 0.25)); } pulse = ctx.createPeriodicWave(re, im); }
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); let s = 1; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
    nextAt = ctx.currentTime + 0.1;
    setInterval(schedule, 90);
    if (ambName) ambience(ambName, true);
  }
  // Changes the tune without a jolt: the one playing fades out, the next starts from its top and fades in.
  // The set that should be playing: the visitor's own pick, or on Auto the place's (H14).
  const autoSet = () => place === 'camp' && dark ? CAMP_AT_DUSK : PLACE_SETS[place] || 0, wantSet = () => ownSet == null ? autoSet() : ownSet;
  const trimOf = () => (SETS[set].level || 1) * (SETS[set].tunes ? SETS[set].tunes[cur] || 1 : 1), trimTo = () => { if (trim) trim.gain.setTargetAtTime(trimOf(), ctx.currentTime, 0.03); };
  // The music fades out, changes and fades back in. What changes is the tune, the set of instruments, or
  // both: a tune that stays goes on from where it was, through the new instruments.
  function fadeTo(i, quick) {
    loops = 0; if (i === cur && swap == null && set === wantSet()) return;
    if (!ctx) { cur = i; set = wantSet(); return; }
    const first = swap == null; swap = i; if (!first) return;
    music.gain.cancelScheduledValues(ctx.currentTime); music.gain.setTargetAtTime(0.0001, ctx.currentTime, quick ? 0.06 : 0.3);
    setTimeout(() => { if (swap !== cur) step = 0; cur = swap; swap = null; set = wantSet(); trimTo(); if (out.onchange) out.onchange(); nextAt = Math.max(nextAt, ctx.currentTime + 0.05); music.gain.cancelScheduledValues(ctx.currentTime); music.gain.setTargetAtTime(level, ctx.currentTime, quick ? 0.12 : 0.5); }, quick ? 220 : 1100);
  }
  // One note: a square, pulse or triangle wave with a quick attack and a falling tail.
  function tone(out, type, f0, t, dur, vol, f1) {
    if (!f0) return;
    if (VOICES[type]) return voice(out, type, f0, t, dur, vol * VOICES[type]);
    const o = ctx.createOscillator(), g = ctx.createGain(), V = SETS[set];
    // Effects are written for the console; the other sets play them through their own voice.
    if (out === fx) { const to = V.fx[type]; if (to) { vol *= (V.fxVol && V.fxVol[type]) || 1; type = to; } f0 *= V.pitch; if (f1) f1 *= V.pitch; if (type === 'sine') vol *= 1.5; }
    if (type === 'pulse') { o.setPeriodicWave(pulse); vol *= 0.8; } else o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (V.pluck && out === music) { dur = Math.max(dur, 0.5); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * 1.6, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    else { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.setValueAtTime(vol, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
    return o;
  }
  // A note of one of the round 8 instruments (E3), each made after how the real thing sounds:
  //   mallet   a marimba bar: a sine, with a bright partial two octaves up that is gone at once, struck and left to ring
  //   tom      a tuned drum: a sine whose pitch settles from a little sharp as the skin does
  //   bow      a bowed string: two saws a few cents apart behind a filter that opens as the bow bites, slow in and out
  //   pizz     a plucked string: a saw whose filter closes as it rings
  //   flute    a sine with a little of its octave, and a breath of noise as the note speaks
  //   reed     a clarinet: a square (odd harmonics only) behind a filter, soft at its edges
  //   bassoon  a narrow pulse, low down, behind a filter
  // Answers the oscillator that carries the pitch, for the vibrato on a held note.
  function voice(out, kind, f0, t, dur, vol) {
    const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7; lp.frequency.value = 18000; lp.connect(g); g.connect(out);
    let end = t + dur;
    const osc = (type, f, v, cents) => { const o = ctx.createOscillator(), og = ctx.createGain(); if (type === 'pulse') o.setPeriodicWave(pulse); else o.type = type; o.frequency.setValueAtTime(f, t); if (cents) o.detune.value = cents; og.gain.value = v; o.connect(og); og.connect(lp); o.start(t); return [o, og]; };
    // struck: up at once and dying away over `ring` seconds. blown: in over `a` seconds, held, and out over `r`.
    const struck = ring => { end = t + Math.max(dur, ring); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, end); };
    const blown = (a, r) => { end = t + dur + r; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(a, dur * 0.5)); g.gain.setValueAtTime(vol, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, end); };
    let all;
    if (kind === 'mallet') { const hi = osc('sine', f0 * 4, 0.3); hi[1].gain.setValueAtTime(0.3, t); hi[1].gain.exponentialRampToValueAtTime(0.0001, t + 0.07); all = [osc('sine', f0, 1), hi]; struck(0.55); noise(out, t, 0.012, vol * 0.25, 2600, 1, 'bandpass'); }
    else if (kind === 'tom') { all = [osc('sine', f0, 1)]; all[0][0].frequency.setValueAtTime(f0 * 1.3, t); all[0][0].frequency.exponentialRampToValueAtTime(f0, t + 0.07); struck(0.4); noise(out, t, 0.03, vol * 0.2, 500, 0.8, 'lowpass'); }
    else if (kind === 'bow') { all = [osc('sawtooth', f0, 0.5, -7), osc('sawtooth', f0, 0.5, 7)]; lp.frequency.setValueAtTime(f0 * 1.5, t); lp.frequency.linearRampToValueAtTime(Math.min(5200, f0 * 6), t + 0.12); blown(0.08, 0.14); }
    else if (kind === 'pizz') { all = [osc('sawtooth', f0, 1)]; lp.frequency.setValueAtTime(Math.min(9000, f0 * 8), t); lp.frequency.exponentialRampToValueAtTime(f0 * 1.5, t + 0.16); struck(0.38); }
    else if (kind === 'flute') { all = [osc('sine', f0, 1), osc('sine', f0 * 2, 0.16), osc('sine', f0 * 3, 0.05)]; blown(0.05, 0.08); noise(out, t, 0.07, vol * 0.12, f0 * 2, 1.5, 'bandpass'); }
    else if (kind === 'reed') { all = [osc('square', f0, 1)]; lp.frequency.value = Math.min(6000, f0 * 5); blown(0.02, 0.05); }
    else { all = [osc('pulse', f0, 1)]; lp.frequency.value = Math.min(3000, f0 * 4.5); blown(0.03, 0.07); }
    for (const [o] of all) o.stop(end + 0.03);
    return all[0][0];
  }
  function noise(out, t, dur, vol, freq = 4000, q = 0.7, type = 'highpass') {
    const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = noiseBuf; n.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(out); n.start(t, Math.random()); n.stop(t + dur + 0.02);
  }
  // The sound test (P3): solo is 'a' or 'b' while one part of one tune plays round and round, else null.
  let solo = null;
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    const tr = TRACKS[cur], dt = 60 / tr.bpm / tr.div, len = tr.lead.length;
    while (nextAt < ctx.currentTime + 0.25) {
      // sec: which third of a play this is. pass: how many plays of this tune have gone by.
      const sec = solo ? (solo === 'b' ? 1 : 0) : Math.floor(step / len) % 3, pass = Math.floor(step / (len * 3)), P = sec === 1 ? tr.b : tr;
      const i = step % len, hold = (l, k) => { let n = 1; while (l[(k + n) % len] === '.' && n < 16) n++; return n; };
      const V = SETS[set], up = V.octave || 1, dv = V.drums;
      const a = P.lead[i]; if (a !== '.' && a !== '-') {
        const n = hold(P.lead, i), o = tone(music, V.lead, hz(a) * up, nextAt, dt * n * 0.95, 0.16);
        // When the first part comes back the melody is doubled an octave down, so the return sounds fuller than the start.
        if (sec === 2) tone(music, V.lead, hz(a) * up / 2, nextAt, dt * n * 0.95, 0.06);
        // A held note gets a little vibrato once it has settled.
        if (o && n >= 3 && !V.pluck && !V.still) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.6; lg.gain.setValueAtTime(0, nextAt + dt); lg.gain.linearRampToValueAtTime(hz(a) * up * 0.007, nextAt + dt * 2); l.connect(lg); lg.connect(o.frequency); l.start(nextAt); l.stop(nextAt + dt * n); }
      }
      const b = P.arp[i]; if (b !== '.' && b !== '-') tone(music, V.arp, hz(b) * up, nextAt, dt * 0.8, V.arp === 'square' ? 0.045 : 0.07);
      const c = P.bass[i]; if (c !== '.' && c !== '-') tone(music, V.bass, hz(c) * up, nextAt, dt * hold(P.bass, i) * 0.9, V.bass === 'square' ? 0.1 : 0.3);
      // On every second play the drums sit out the first four bars, so a tune does not come round the same way twice.
      const dr = pass % 2 === 1 && sec === 0 && i < len / 2 ? '-' : P.drum[i]; if (!dv) { /* no drums in a music box */ } else if (dr === 'k') tone(music, 'triangle', 150, nextAt, 0.12, 0.4 * dv, 45); else if (dr === 's') noise(music, nextAt, 0.11, 0.16 * dv, 1800, 0.6, 'bandpass'); else if (dr === 'h') noise(music, nextAt, 0.035, 0.05 * dv, 7000);
      // The percussion set's own (round 8, E3): a shaker on every step the drums leave empty, a woodblock with
      // every second hat, a low tom under the kick and a high one before each fourth bar.
      if (V.perc) { if (dr === '-') noise(music, nextAt, 0.025, 0.022, 9000); else if (dr === 'h' && i % 4 === 2) tone(music, 'sine', 1150, nextAt, 0.035, 0.07); else if (dr === 'k') voice(music, 'tom', 98, nextAt, 0.2, 0.22); if (i % 32 >= 29 && dr !== '-') voice(music, 'tom', [196, 165, 131][i % 32 - 29], nextAt, 0.15, 0.2); }
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
    // Drizzle on rock: a few seconds of soft hiss with a patter in it.
    drizzle: t => { noise(fx, t, 3.2, 0.095, 5200, 0.7, 'bandpass'); for (let i = 0; i < 9; i++) noise(fx, t + 0.2 + i * 0.33 + Math.random() * 0.2, 0.03, 0.08, 2600 + Math.random() * 1800, 5, 'bandpass'); },
    // A bluebird's song: three soft, slurred notes.
    warble: t => [[2300, 1900], [2000, 2500], [2400, 2050]].forEach(([a, b], i) => tone(fx, 'sine', a, t + i * 0.09, 0.08, 0.1, b)),
    // A phone's notice: two soft rising notes.
    chime: t => { tone(fx, 'sine', 880, t, 0.12, 0.16); tone(fx, 'sine', 1319, t + 0.11, 0.22, 0.16); },
    fall: t => { tone(fx, 'square', 900, t, 0.3, 0.2, 140); noise(fx, t, 0.1, 0.12, 2400, 1, 'bandpass'); },
    catch: t => { tone(fx, 'triangle', 110, t, 0.2, 0.5, 70); tone(fx, 'square', 330, t + 0.12, 0.08, 0.14); },
    place: t => { noise(fx, t, 0.03, 0.25, 5000); tone(fx, 'square', 1400, t + 0.02, 0.04, 0.18); },
    glow: t => { tone(fx, 'square', 1320, t, 0.05, 0.08); tone(fx, 'square', 1760, t + 0.04, 0.08, 0.08); },
    flag: t => [523, 659, 784, 1047].forEach((f, i) => tone(fx, 'square', f, t + i * 0.09, i === 3 ? 0.34 : 0.09, 0.2)),
    summit: t => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => { tone(fx, 'square', f, t + i * 0.08, i === 5 ? 0.5 : 0.09, 0.2); tone(fx, 'triangle', f / 2, t + i * 0.08, 0.12, 0.3); }),
    glissade: t => { noise(fx, t, 2.2, 0.2, 2600, 0.5, 'bandpass'); tone(fx, 'triangle', 700, t, 2.1, 0.1, 180); },
    // Meltwater under the moraine: a few quick bubbles of running water.
    gurgle: t => { for (let i = 0; i < 4; i++) { const d = i * 0.07 + Math.random() * 0.05; noise(fx, t + d, 0.09, 0.05, 900 + Math.random() * 700, 4, 'bandpass'); tone(fx, 'sine', 420 + Math.random() * 380, t + d, 0.07, 0.05, 700 + Math.random() * 500); } },
    // The glacier settling: a deep, slow groan with a crack in it, far off.
    creak: t => { tone(fx, 'sawtooth', 70, t, 0.9, 0.05, 52); noise(fx, t + 0.5, 0.25, 0.08, 260, 1, 'lowpass'); },
    crack: t => { noise(fx, t, 0.35, 0.3, 500, 1, 'lowpass'); tone(fx, 'square', 160, t, 0.2, 0.18, 60); },
    wind: t => noise(fx, t, 1.4, 0.6, 700, 1.4, 'bandpass'),
    // The same whoosh high on the West Ridge: louder, longer and lower.
    windHi: t => { noise(fx, t, 2.2, 0.82, 520, 1.1, 'bandpass'); noise(fx, t + 0.3, 1.6, 0.38, 1100, 2, 'bandpass'); },
    egg: t => [784, 988, 1175, 1568].forEach((f, i) => tone(fx, 'square', f, t + i * 0.06, 0.1, 0.16)),
    meow: t => { tone(fx, 'square', 620, t, 0.12, 0.16, 940); tone(fx, 'square', 940, t + 0.12, 0.2, 0.16, 520); },
    purr: t => { for (let i = 0; i < 14; i++) tone(fx, 'triangle', 52, t + i * 0.045, 0.03, 0.5); },
    chirp: t => { tone(fx, 'square', 2600, t, 0.05, 0.07, 3400); tone(fx, 'square', 3000, t + 0.08, 0.05, 0.07, 2400); },
    bark: t => noise(fx, t, 0.2, 6.3, 300, 1, 'lowpass'),
    // A Clark's nutcracker in the larches: a harsh, drawn-out kraa, twice.
    kraa: t => { for (let i = 0; i < 2; i++) { noise(fx, t + i * 0.3, 0.22, 0.22, 1300, 4, 'bandpass'); tone(fx, 'square', 520, t + i * 0.3, 0.2, 0.067, 430); } },
    step: t => noise(fx, t, 0.02, 2.5, 1200, 1, 'bandpass'),
    // An ice tool biting: a short bright tick. And the server rack being hit: a low thump, a crunch and a ring of sheet metal.
    // Two hands meeting.
    slap: t => { noise(fx, t, 0.035, 3.3, 2200, 1.1, 'bandpass'); noise(fx, t, 0.02, 1.25, 5200, 2, 'bandpass'); },
    // One stone set down on another: a short dry knock and its echo.
    clack: t => { noise(fx, t, 0.03, 0.5, 1700, 2.5, 'bandpass'); tone(fx, 'triangle', 420, t, 0.04, 0.3, 300); noise(fx, t + 0.06, 0.02, 0.15, 2400, 2.5, 'bandpass'); },
    tink: t => { noise(fx, t, 0.02, 0.36, 6200, 3, 'bandpass'); tone(fx, 'square', 2400, t, 0.03, 0.2, 1900); },
    bang: t => { tone(fx, 'triangle', 150, t, 0.3, 0.7, 42); noise(fx, t, 0.16, 0.4, 320, 0.8, 'lowpass'); noise(fx, t + 0.01, 0.07, 0.2, 2600, 2, 'bandpass'); tone(fx, 'square', 520, t + 0.03, 0.2, 0.08, 470); },
    // Ice breaking far off: a long low roll, a second wave of it, and a deep note under both (E4).
    rumble: t => { noise(fx, t, 1.8, 0.22, 150, 0.7, 'lowpass'); noise(fx, t + 0.25, 1.2, 0.12, 420, 0.8, 'lowpass'); tone(fx, 'triangle', 58, t, 1.4, 0.16, 36); },
    // The avalanche (E5c): a longer, deeper roll than a serac's, building and dying away.
    avalanche: t => { noise(fx, t, 4.5, 0.3, 110, 0.7, 'lowpass'); noise(fx, t + 0.4, 3.4, 0.16, 300, 0.8, 'lowpass'); tone(fx, 'triangle', 44, t, 3.8, 0.2, 28); },
    // The animals' answers to a click (round 6, note 10). A bull elk's bugle: a low grunt that climbs to a long
    // high whistle and breaks off in grunts.
    bugle: t => { tone(fx, 'sawtooth', 160, t, 0.18, 0.06, 220); tone(fx, 'sine', 520, t + 0.15, 0.55, 0.12, 1900); tone(fx, 'sine', 1900, t + 0.7, 0.5, 0.1, 1700); for (let i = 0; i < 3; i++) tone(fx, 'sawtooth', 130, t + 1.25 + i * 0.16, 0.08, 0.06, 110); },
    // Another bull answering from a long way off (round 8, H4): the whistle alone, quiet and a little lower, and two grunts barely there.
    bugleFar: t => { tone(fx, 'sine', 470, t, 0.6, 0.035, 1700); tone(fx, 'sine', 1700, t + 0.6, 0.55, 0.03, 1500); for (let i = 0; i < 2; i++) tone(fx, 'sawtooth', 120, t + 1.2 + i * 0.18, 0.08, 0.014, 100); },
    // A goat's or a calf's bleat: one wavering note.
    bleat: t => { for (let i = 0; i < 5; i++) tone(fx, 'square', i & 1 ? 560 : 620, t + i * 0.05, 0.05, 0.12); },
    // A snort: a short blast of breath through the nose.
    snort: t => { noise(fx, t, 0.16, 3.5, 700, 0.9, 'lowpass'); noise(fx, t + 0.05, 0.08, 1.6, 1800, 1.5, 'bandpass'); },
    // Two heads meeting, horn on horn (round 8, D2): a sharp crack over a low knock.
    clash: t => { noise(fx, t, 0.05, 0.67, 2400, 1.2, 'bandpass'); tone(fx, 'triangle', 300, t, 0.12, 0.45, 140); },
    // A black bear's huff: two quick, deep blows.
    huff: t => { noise(fx, t, 0.12, 3, 380, 0.8, 'lowpass'); noise(fx, t + 0.2, 0.14, 2.6, 340, 0.8, 'lowpass'); },
    // A cub's bawl: a short falling cry.
    bawl: t => tone(fx, 'square', 760, t, 0.22, 0.135, 480),
    // A squirrel's chatter: a fast run of dry ticks.
    chatter: t => { for (let i = 0; i < 12; i++) tone(fx, 'square', 2300 + (i & 1) * 300, t + i * 0.045, 0.025, 0.08); },
    // A bald eagle's cry: thin, high, piping notes that fall away.
    cry: t => [2600, 2500, 2350, 2200, 2050].forEach((f, i) => tone(fx, 'sine', f, t + i * 0.09, 0.06, 0.08, f - 300)),
    // A mallard hen's quack: a short run of flat, nasal notes, each a little lower and softer than the last.
    quack: t => { for (let i = 0; i < 3; i++) { tone(fx, 'sawtooth', 560 - i * 30, t + i * 0.17, 0.11, 0.22 - i * 0.047, 430 - i * 30); noise(fx, t + i * 0.17, 0.05, 0.126, 1500, 3, 'bandpass'); } },
    // An osprey's call: short whistled kews.
    kew: t => { for (let i = 0; i < 4; i++) tone(fx, 'sine', 1800, t + i * 0.13, 0.07, 0.08, 2300); },
    // A whale's or an orca's blow: a breathy rush of air.
    blow: t => { noise(fx, t, 0.7, 0.9, 900, 0.6, 'bandpass'); noise(fx, t, 0.3, 0.45, 300, 0.8, 'lowpass'); },
    // A small thing slipping under the water.
    plop: t => tone(fx, 'sine', 900, t, 0.09, 0.12, 300),
    // Gulls' mewing and ravens' croaks.
    mew: t => { tone(fx, 'square', 1300, t, 0.18, 0.05, 900); tone(fx, 'square', 1250, t + 0.24, 0.16, 0.04, 880); },
    croak: t => { for (let i = 0; i < 2; i++) { tone(fx, 'square', 240, t + i * 0.28, 0.16, 0.08, 190); noise(fx, t + i * 0.28, 0.14, 0.06, 700, 2, 'bandpass'); } },
    // A barred owl's hoot: who cooks for you.
    hoot: t => [[390, 0.14], [390, 0.14], [430, 0.12], [390, 0.36]].reduce((d, [f, l]) => { tone(fx, 'sine', f, t + d, l, 0.16, f * 0.92); return d + l + 0.08; }, 0),
    // A loon's wail: a long, rising and falling cry over the water.
    wail: t => { tone(fx, 'sine', 620, t, 0.5, 0.12, 930); tone(fx, 'sine', 930, t + 0.5, 0.7, 0.12, 820); tone(fx, 'sine', 820, t + 1.2, 0.5, 0.1, 600); },
    locked: t => { tone(fx, 'square', 180, t, 0.08, 0.16); tone(fx, 'square', 150, t + 0.09, 0.12, 0.16); },
    unlock: t => [659, 784, 988, 1319].forEach((f, i) => tone(fx, 'triangle', f, t + i * 0.07, 0.14, 0.4))
  };

  // A bed of sound under each scene: wind, water, and now and then a bird.
  function ambience(name, force) {
    if (name === ambName && !force) return; ambName = name;
    if (!ctx) return;
    for (const n of ambNodes) { try { n.stop(); } catch { /* already stopped */ } } ambNodes = []; clearInterval(ambTimer);
    const bed = (freq, q, vol, type = 'bandpass') => { const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain(); n.buffer = noiseBuf; n.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol; l.frequency.value = 0.13; lg.gain.value = vol * 0.5; l.connect(lg); lg.connect(g.gain); n.connect(f); f.connect(g); g.connect(amb); n.start(); l.start(); ambNodes.push(n, l); };
    if (name === 'forest') { bed(2400, 0.4, 0.095); bed(500, 0.6, 0.048); }
    else if (name === 'lakeside') { bed(900, 0.5, 0.07); bed(3000, 0.3, 0.03); }
    else if (name === 'wall') bed(500, 1.2, 0.28);
    // The larch basin: wind over open granite and the cascade below the tarn, far off.
    else if (name === 'larches') { bed(650, 1, 0.133); bed(2800, 0.6, 0.037); }
    // The walk to camp: wind on the open slope, and the river far below in the valley.
    else if (name === 'approach') { bed(700, 0.9, 0.127); bed(1300, 0.4, 0.028); }
    else if (name === 'camp' || name === 'climb' || name === 'offroute') { bed(420, 1.6, 0.25); bed(1500, 0.8, 0.063); }
    else bed(1800, 0.3, 0.048);
    if (name === 'world' || name === 'forest' || name === 'lakeside') ambTimer = setInterval(() => { if (ctx.state === 'running' && Math.random() < 0.5) FX.chirp(ctx.currentTime + Math.random() * 0.5); }, 2600);
    // Up in the basin no songbirds: now and then the pika eeps from its rocks (a hint that it is there) or a nutcracker calls.
    else if (name === 'larches') ambTimer = setInterval(() => { const r = Math.random(); if (ctx.state === 'running' && r < 0.35) FX[r < 0.2 ? 'eep' : 'kraa'](ctx.currentTime + Math.random() * 0.5); }, 3200);
  }

  const out = {
    start,
    sfx(name) { if (!ctx || muted || !FX[name]) return; try { FX[name](ctx.currentTime + 0.005); } catch { /* a sound is never worth an error */ } },
    ambience,
    // Rain on the lake (round 8, H15): a soft hiss with a lower patter under it, as loud as the drizzle is
    // heavy (k, 0 to 1). It is built the first time it rains with the sound on, and is silent between showers.
    rain(k) { k = Math.round(Math.max(0, Math.min(1, k || 0)) * 20) / 20; if (k === rainK && (rainG || !k || !ctx)) return; rainK = k; if (!ctx) return;
      if (!rainG) { rainG = ctx.createGain(); rainG.gain.value = 0; rainG.connect(amb);
        for (const [type, freq, q, vol] of [['highpass', 4500, 0.5, 0.05], ['bandpass', 1400, 0.8, 0.035]]) { const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); n.buffer = noiseBuf; n.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol; n.connect(f); f.connect(g); g.connect(rainG); n.start(); } }
      rainG.gain.setTargetAtTime(k, ctx.currentTime, 0.5); },
    rainLevel: () => rainK,
    muted: () => muted,
    // Whether anything can be heard yet: a browser holds the sound back until the first click, tap or key.
    live: () => !!ctx && ctx.state === 'running',
    // The page has gone out of sight, or come back (round 8, note 24): the sound stops with it and comes back
    // with it, if it was running when it went.
    away(gone) { if (!ctx) return; if (gone) { if (ctx.state === 'running') { held = true; ctx.suspend(); } } else if (held) { held = false; ctx.resume(); } },
    setMuted(m) { muted = !!m; if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05); try { localStorage.setItem('trailhead.muted', muted ? '1' : '0'); } catch { /* private window */ } },
    track: () => ({ index: swap == null ? cur : swap, name: TRACKS[swap == null ? cur : swap].name, count: TRACKS.length, auto }),
    // The scene has changed: in Auto the music changes with it.
    place(name) { if (!PLACES[name] || name === place) return; place = name; turn = 0; fadeTo(auto ? PLACES[name][0] : swap == null ? cur : swap); },
    // Day has turned to Dusk or back: at camp the Auto style changes with it (H14).
    dusk(d) { if (dark === !!d) return; dark = !!d; fadeTo(swap == null ? cur : swap); },
    // The music menu: one track by its number, kept until Auto is picked again; -1 is Auto, which follows the place.
    pick(k) { if (k < 0) { auto = true; fadeTo(PLACES[place][0], true); } else { auto = false; if (k !== (swap == null ? cur : swap)) fadeTo(k, true); } try { if (auto) localStorage.removeItem('trailhead.track'); else localStorage.setItem('trailhead.track', String(k)); } catch { /* private window */ } },
    // The track that Auto plays in the place he is in now.
    autoTrack: () => TRACKS[PLACES[place][0]].name,
    // The set that is playing, whether the style is on Auto, and the set Auto plays in this place.
    set: () => ({ index: set, name: SETS[set].name, count: SETS.length, auto: ownSet == null, autoName: SETS[autoSet()].name }),
    // The debug menu's sound test (P3): every effect by its name here, every tune's two parts on their own,
    // and every place's background sound.
    fxNames: () => Object.keys(FX),
    tunes: () => TRACKS.map(t => t.name),
    preview(k, part) { start(); auto = false; solo = part; if (k === cur && swap == null) { step = 0; if (ctx) nextAt = ctx.currentTime + 0.05; } else fadeTo(k, true); },
    endPreview() { solo = null; auto = true; turn = 0; fadeTo(PLACES[place][0], true); },
    // The music menu's styles: -1 is Auto, which follows the place, and a set picked by its number stays.
    setSet(i) { if (i < 0) { ownSet = null; try { localStorage.removeItem('trailhead.set'); } catch { /* private window */ } fadeTo(swap == null ? cur : swap, true); return SETS[autoSet()].name; }
      set = ownSet = ((i % SETS.length) + SETS.length) % SETS.length; trimTo(); try { localStorage.setItem('trailhead.set', String(set)); } catch { /* private window */ } return SETS[set].name; },
    // How much the music steps back: 0 out in the world, 1 while a card is being read, 2 under a sheet.
    focus(lv) { if (!music) return; level = [0.22, 0.15, 0.13][lv] || 0.22; if (swap == null) { music.gain.cancelScheduledValues(ctx.currentTime); music.gain.setTargetAtTime(level, ctx.currentTime, 0.25); } tone0.frequency.setTargetAtTime(lv === 2 ? 900 : 16000, ctx.currentTime, 0.2); }
  };
  return out;
}
