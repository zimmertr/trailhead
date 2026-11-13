// The plain page is all HTML; this adds only its styles and error reporting.
import './styles/page.css'
import { reportErrors } from './analytics.ts'

reportErrors(window)
