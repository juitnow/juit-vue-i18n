import { $gry, $ylw } from '@plugjs/plug'
import { patchProp } from '@vue/runtime-dom'
import { createRenderer } from 'vue'

import type { JSDOM } from 'jsdom'
import type { App, Component, Renderer } from 'vue'

function createJSDomRenderer(dom: JSDOM): Renderer<Element> {
  const document = dom.window.document

  return createRenderer<Node, Element>({
    // Create element...
    createElement: (tag, namespace, is, props) => {
      let el: Element

      if (namespace === 'svg') {
        el = document.createElementNS('http://www.w3.org/2000/svg', tag)
      } else if (namespace === 'mathml') {
        el = document.createElementNS('http://www.w3.org/1998/Math/MathML', tag)
      } else {
        el = is ? document.createElement(tag, { is }) : document.createElement(tag)
      }

      if (tag === 'select' && props && props['multiple'] != null) {
        el.setAttribute('multiple', props['multiple'])
      }
      return el
    },

    // One liner functions for DOM manipulation
    insert: (child, parent, anchor) => parent.insertBefore(child, anchor || null),
    remove: (child) => child.parentNode?.removeChild(child),
    createText: (text) => document.createTextNode(text),
    createComment: (text) => document.createComment(text),
    setText: (node, text) => (node.nodeValue = text),
    setElementText: (el, text) => (el.textContent = text),
    parentNode: (node) => node.parentNode as Element | null,
    nextSibling: (node) => node.nextSibling,
    querySelector: (selector) => document.querySelector(selector),
    setScopeId: (el, id) => el.setAttribute(id, ''),
    cloneNode: (node) => node.cloneNode(),

    // Straight from Vue's DOM Runtime
    patchProp: patchProp,
  })
}

export function createJSDomApp(
  dom: JSDOM,
  rootComponent: Component,
  rootProps?: Record<string, unknown> | null,
): App<Element> {
  // Create the Vue app using the custom JSDOM renderer
  const app = createJSDomRenderer(dom).createApp(rootComponent, rootProps)

  // Override the mount method to support JSDOM elements
  const mount = app.mount.bind(app)
  app.mount = (el: Element | string) => {
    if (typeof el === 'string') {
      const element = dom.window.document.querySelector(el)
      if (!element) throw new Error(`Element not found: ${el}`)
      return mount(element)
    } else if (el) {
      return mount(el)
    } else {
      throw new Error(`Null element provided to mount`)
    }
  }

  app.config.warnHandler = (msg, _instance, trace) => {
    log.warn(`${$gry('[')}${$ylw('vue')}${$gry(']')} ${msg} ${trace}`)
  }

  // Return the app instance
  return app
}
