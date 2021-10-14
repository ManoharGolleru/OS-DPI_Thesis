import { html } from "uhtml";
import { styleString } from "./style";

class ComponentNameMap {
  componentFromName = new Map();
  nameFromComponent = new Map();

  /**
   * @param {string} name
   * @param {typeof Base} component
   */
  addMap(name, component) {
    this.componentFromName.set(name, component);
    this.nameFromComponent.set(component, name);
  }

  /** @param {Base} component
   * @returns {string}
   */
  name(component) {
    return this.nameFromComponent.get(
      Object.getPrototypeOf(component).constructor
    );
  }

  /** @param {string} name
   * @returns {typeof Base}
   */
  component(name) {
    return this.componentFromName.get(name);
  }
}

export const componentMap = new ComponentNameMap();

let idCounter = 0;
function nextId() {
  return `osdpi${idCounter++}`;
}

export class Base {
  /** @type {Props} */
  static defaultProps = {};

  /** @type {string[]} */
  static allowedChildren = [];

  /**
   * @param {Props} props
   * @param {Context} context
   * @param {Base} parent
   */
  constructor(props, context, parent = null) {
    /** @type {Props} */
    this.props = {
      // @ts-ignore: undefined property
      ...this.constructor.defaultProps,
      ...props,
    };
    /** @type {Context} */
    this.context = context;
    /** @type {Base[]} */
    this.children = [];
    this.parent = parent;
    this.designer = {};
    this.init();
    this.id = nextId();
  }

  init() {}

  /**
   * Return the content for element.
   * @returns {import('uhtml').Hole}
   */
  template() {
    return html`empty`;
  }

  nextSibling() {
    const siblings = this.parent?.children || [];
    const ndx = siblings.indexOf(this);
    if (ndx < 0 || ndx == siblings.length - 1) {
      return null;
    } else {
      return siblings[ndx + 1];
    }
  }
  previousSibling() {
    const siblings = this.parent?.children || [];
    const ndx = siblings.indexOf(this);
    if (ndx < 1) {
      return null;
    } else {
      return siblings[ndx - 1];
    }
  }

  allowedChildren() {
    // @ts-ignore
    return this.constructor.allowedChildren;
  }

  get name() {
    return this.props.name;
  }

  get path() {
    if (this.parent) {
      const index = this.parent.children.indexOf(this);
      return this.parent.path + `[${index}]` + this.constructor.name;
    }
    return this.constructor.name;
  }
}

/**
 * @param {Design} design
 * @param {Context} context
 * @param {Base} parent
 */

export function assemble(design, context, parent = null) {
  console.log(design.type);
  const node = new (componentMap.component(design.type))(
    design.props,
    context,
    parent
  );
  node.children = design.children.map((child) =>
    assemble(child, context, node)
  );
  return node;
}

/**
 * @param {Base} tree
 * @returns {Design}
 */
export function toDesign(tree) {
  return {
    type: componentMap.name(tree),
    props: tree.props,
    children: tree.children.map(toDesign),
  };
}

class Page extends Base {
  static defaultProps = {};
  static allowedChildren = ["stack"];

  template() {
    return html`${this.children.map((child) => child.template())}`;
  }
}
componentMap.addMap("page", Page);

class Stack extends Base {
  static defaultProps = { direction: "column", background: "", scale: "1" };
  static allowedChildren = ["stack", "grid", "display", "radio", "tab control"];

  template() {
    const style = styleString({
      flexGrow: this.props.scale,
      backgroundColor: this.props.background,
    });
    const empty = this.children.length ? "" : "empty";
    return html`<div
      id=${this.id}
      class=${`stack flex ${this.props.direction} ${empty}`}
      style=${style}
    >
      ${this.children.map((child) => child.template())}
    </div>`;
  }

  get name() {
    return this.props.name || this.props.direction;
  }
}
componentMap.addMap("stack", Stack);
