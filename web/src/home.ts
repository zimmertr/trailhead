// The home page: the still is already in the HTML; this adds error reporting
// and then the 3D, which replaces nothing until it has drawn.
import './styles/index.ts'
import { reportErrors } from './analytics.ts'

reportErrors(window)
const world = document.getElementById('world')
if (world) void import('./world/placeholder.ts').then(({ mountPlaceholder }) => mountPlaceholder(world))

export const accent = '#ff6600'
