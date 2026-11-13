import data from '../dist/content.json' with { type: 'json' }
import type { Content } from './schema.ts'

export type { Content, Milestone, Place, Profile, Project } from './schema.ts'

// Checked by the build step that wrote it (src/build.ts), so readers trust its
// shape rather than parse it again at run time.
export const content: Content = data
