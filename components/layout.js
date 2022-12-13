import { html } from "uhtml";
import { TreeBase } from "./treebase";
import { DesignerTabPanel } from "./tabcontrol";
import "css/layout.css";
import db from "app/db";
import Globals from "app/globals";

const emptyPage = {
  className: "Page",
  props: {},
  children: [
    {
      className: "Speech",
      props: {},
      children: [],
    },
  ],
};

// map old names to new for the transition
const typeToClassName = {
  audio: "Audio",
  stack: "Stack",
  page: "Page",
  grid: "Grid",
  speech: "Speech",
  button: "Button",
  logger: "Logger",
  gap: "Gap",
  option: "Option",
  radio: "Radio",
  vsd: "VSD",
  "modal dialog": "ModalDialog",
  "tab control": "TabControl",
  "tab panel": "TabPanel",
  display: "Display",
};

export class Layout extends DesignerTabPanel {
  allowDelete = false;

  static tableName = "layout";
  static defaultValue = emptyPage;

  settings() {
    return html`<div class="treebase layout" help="Layout tab" id=${this.id}>
      ${this.children[0].settings()}
    </div>`;
  }

  /**
   * An opportunity to upgrade the format if needed
   * @param {any} obj
   * @returns {Object}
   */
  static upgrade(obj) {
    function oldToNew(obj) {
      if ("type" in obj) {
        const newObj = { children: [...obj.children] };
        // convert to new representation
        if (
          (obj.type === "grid" || obj.type === "vsd") &&
          "filters" in obj.props
        ) {
          newObj.children = obj.props.filters.map((filter) => ({
            className: "GridFilter",
            props: { ...filter },
            children: [],
          }));
        } else {
          newObj.children = obj.children.map((child) => oldToNew(child));
        }
        newObj.className = typeToClassName[obj.type];
        const { filters, ...props } = obj.props;
        newObj.props = props;
        obj = newObj;
      }
      return obj;
    }
    obj = oldToNew(obj);
    // upgrade from the old format
    return {
      className: "Layout",
      props: { name: "Layout" },
      children: [obj],
    };
  }

  toObject(persist = true) {
    return this.children[0].toObject(persist);
  }

  /** Update the state
   */
  onUpdate() {
    db.write("layout", this.children[0].toObject());
    Globals.state.update();
  }
}
TreeBase.register(Layout, "Layout");
