// The plain page is all HTML; this adds only its styles and error reporting.
import './styles/index.ts'
import { reportErrors } from './analytics.ts'

reportErrors(window)
