// The repo's own lint rules. Each has a fixture under fixtures/ that must trip
// it, and selftest.js fails when one doesn't: a rule that matches nothing
// reports nothing, which looks exactly like a clean tree.

const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(/i

// A catch that neither uses its error nor throws hides the failure it caught
// (cicd.md, Pull request checks). Rethrow it, log it, or suppress this rule
// with the reason beside the suppression.
const noSwallowedCatch = {
  meta: { type: 'problem', messages: { swallowed: 'Rethrow or log the caught error, or suppress this rule with the reason beside it.' }, schema: [] },
  create(context) {
    const throws = (node) => {
      let found = false
      const visit = (n) => {
        if (!n || typeof n.type !== 'string' || found) return
        if (n.type === 'ThrowStatement') found = true
        if (n.type.includes('Function')) return
        for (const [key, value] of Object.entries(n)) {
          if (key === 'parent') continue
          if (Array.isArray(value)) value.forEach(visit)
          else if (value && typeof value.type === 'string') visit(value)
        }
      }
      visit(node)
      return found
    }
    return {
      CatchClause(node) {
        const [variable] = node.param ? context.sourceCode.getDeclaredVariables(node) : []
        const used = variable ? variable.references.length > 0 : false
        if (!used && !throws(node.body)) context.report({ node, messageId: 'swallowed' })
      },
      // promise.catch(() => fallback): the same, written as a callback.
      'CallExpression[callee.property.name="catch"]'(node) {
        const [handler] = node.arguments
        if (handler && /FunctionExpression$/.test(handler.type) && handler.params.length === 0 && !throws(handler.body)) {
          context.report({ node: handler, messageId: 'swallowed' })
        }
      },
    }
  },
}

// Every colour has one owner (ui.md, Design system): tokens.css for the
// page, web/src/world/palette.ts for the canvas.
const noColourLiteral = {
  meta: { type: 'problem', messages: { colour: 'Take this colour from web/src/styles/tokens.css or web/src/world/palette.ts.' }, schema: [] },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value === 'string' && COLOUR.test(node.value)) context.report({ node, messageId: 'colour' })
        if (typeof node.value === 'number' && /^0x[0-9a-f]{6}$/i.test(node.raw)) context.report({ node, messageId: 'colour' })
      },
      TemplateElement(node) {
        if (COLOUR.test(node.value.raw)) context.report({ node, messageId: 'colour' })
      },
    }
  },
}

// Client identity comes only from the proxy's header, through clientBucket
// in api/src/client.ts (service.md, Client identity). The socket address is
// the proxy's, and logging it would put an address in the logs.
const noSocketAddress = {
  meta: { type: 'problem', messages: { address: 'Take the client from the proxy header through clientBucket (api/src/client.ts), never from the socket.' }, schema: [] },
  create(context) {
    return {
      MemberExpression(node) {
        const name = node.property.type === 'Identifier' ? node.property.name : node.property.value
        if (['ip', 'ips', 'remoteAddress', 'socket'].includes(name)) context.report({ node, messageId: 'address' })
      },
    }
  },
}

export const trailhead = {
  meta: { name: 'trailhead' },
  rules: { 'no-swallowed-catch': noSwallowedCatch, 'no-colour-literal': noColourLiteral, 'no-socket-address': noSocketAddress },
}
