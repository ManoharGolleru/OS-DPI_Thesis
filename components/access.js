import { log } from "../log";
import { html } from "uhtml";
import { Base } from "./base";
import { textInput } from "./input";
import { validateExpression } from "../eval";
import db from "../db";
import css from "ustyler";
import {
  debounceTime,
  delayWhen,
  filter,
  from,
  interval,
  map,
  Observable,
  share,
  distinctUntilKeyChanged,
  groupBy,
  mergeMap,
  fromEvent,
  mergeWith,
} from "rxjs";

/** Maintain data for each visible button in a WeakMap
 * @type {WeakMap<Node, Object>}
 */
export const AccessMap = new WeakMap();

/** Provide a ref to update the map
 * @param {Object} data
 * @returns {function(Node)}
 */
export function UpdateAccessData(data) {
  return (node) => AccessMap.set(node, data);
}

/** debugging helper
 * @param {string} label
 * @param {Observable} obs
 */
function show(label, obs) {
  obs.subscribe((v) => console.log(label, v));
}

// ideas for the groups data structure
const groups = [
  {
    type: "group",
    label: "controls",
    cycle: 2,
    children: [
      { type: "button", label: "Home" },
      { type: "button", label: "Close" },
      { type: "button", label: "Speak" },
      { type: "button", label: "Clear" },
      { type: "button", label: "Delete" },
      { type: "button", label: "Keyboard" },
      { type: "button", label: "Numbers" },
    ],
  },
  { type: "button", name: "hp", groupBy: "#row", label: "row #row", cycle: 3 },
  { type: "button", name: "morph", label: "morphs", cycle: 3 },
  {
    type: "group",
    label: "completions",
    children: [{ type: "button", name: "predict", cycle: 2 }],
  },
  {
    type: "group",
    label: "letters",
    children: [
      {
        type: "button",
        name: "kb",
        groupBy: "row",
        label: "row #row",
        cycle: 1,
      },
    ],
  },
  { type: "button", name: "num", cycle: 2 },
];

/** Construct some streams globally for now */
const pointerDown$ = fromEvent(document, "pointerdown");
// undo implicit capture on touch devices
pointerDown$.subscribe(
  /** @param {PointerEvent} x */
  (x) => {
    x.target instanceof Element &&
      x.target.hasPointerCapture(x.pointerId) &&
      x.target.releasePointerCapture(x.pointerId);
  }
);
const pointerMove$ = fromEvent(document, "pointermove");
const pointerUp$ = fromEvent(document, "pointerup");
const pointerEnter$ = fromEvent(document, "pointerover");
const pointerLeave$ = fromEvent(document, "pointerout");
const pointerEnterLeave$ = pointerEnter$.pipe(
  mergeWith(pointerLeave$),
  filter((e) => e.target instanceof HTMLButtonElement)
);
document.addEventListener("contextmenu", (e) => e.preventDefault());

/** creates a stream of conditioned hover events
 * @param {number} Thold - pointer must remain in/out this long
 * @param {Observable<Partial<PointerEvent>>} enterLeave$ - merged stream of enter and leave events
 *
 * We use groupBy to create a stream for each target and then debounce the streams independently
 * before merging them back together. The final distinctUntilKeyChanged prevents producing multiple enter
 * events when the pointer leaves and re-enters in a short time.
 */
export function hoverStream(Thold, enterLeave$) {
  return enterLeave$.pipe(
    groupBy((e) => e.target),
    mergeMap(($group) =>
      $group.pipe(debounceTime(Thold), distinctUntilKeyChanged("type"))
    )
  );
}

export class Access extends Base {
  /**
   * @param {SomeProps} props
   * @param {Context} context
   * @param {Base|Null} parent
   */
  constructor(props, context, parent) {
    super(props, context, parent);
    const { state, rules } = context;

    // state.observe((changed) => this.configure(changed, context));
    this.configure(new Set(), context);
  }

  /** Configure the inputs as requested
   *
   * This should happen when the configuration is changed, not when the state changes. The configuration
   * will not be part of the state; it will be saved in the db just like layout.
   *
   * @param {Set<string>} changed - names of states that changed
   * @param {Context} context
   * @returns {void}
   */
  configure(changed, context) {
    console.log("configure", changed);
    const { state, rules } = context;

    if (0) {
      // This is an example of a hover trigger

      /* I'm using the transitionend event to synchronize the click with css transition.
       We could a timer and do it in js as well.
    */
      fromEvent(document, "transitionend").subscribe((event) => {
        if (!(event.target instanceof HTMLButtonElement)) return;
        const data = AccessMap.get(event.target) || {}; // should this be in a WeakMap?
        const name = data.name;
        if (!data || !name) return;
        rules.applyRules(name, "press", data);
      });

      /* show a visual cue when hovering */
      this.hovers = hoverStream(500, pointerEnterLeave$);
      this.hovers.subscribe((event) => {
        event.target instanceof HTMLButtonElement &&
          event.target.classList.toggle("cue", event.type === "pointerover");
      });
    } else {
      // this is a mouse-click trigger
      pointerUp$.subscribe((event) => {
        if (!(event.target instanceof HTMLButtonElement)) return;
        const data = AccessMap.get(event.target) || {}; // should this be in a WeakMap?
        const name = data.name;
        if (!data || !name) return;
        if ("onClick" in data) {
          data.onClick();
        } else {
          rules.applyRules(name, "press", data);
        }
      });
    }
    // show("hover", this.hovers);
  }

  template() {
    const { state, rules } = this.context;
    return html`Access`;
  }
}

/* Hack the css of the grid for a quick test. There could be a variety of these. */
css`
  button {
    touch-action: none;
    transition: box-shadow 0s;
  }
  button.cue {
    box-shadow: inset 0px 0px 10px 60px red;
    transition: box-shadow 2s ease-in;
    border-radius: 20%;
  }
`;

/* The following doesn't quite work but I'm pretty sure we could do rotating dwell indicators */
`
  .grid button {
    position: relative;
  }
  .grid button.cue:after {
    display: flex;
    content: "";
    width: 50%;
    padding-bottom: 100%;
    justify-item: center;
    border-radius: 50%;
    border-top: 1.1em solid rgba(255, 255, 255, 0.2);
    border-right: 1.1em solid rgba(255, 255, 255, 0.2);
    border-bottom: 1.1em solid rgba(255, 255, 255, 0.2);
    border-left: 1.1em solid #ffffff;
    transform: translateZ(0);
    animation: load8 5.1s infinite linear;
  }
  @keyframes load8 {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;
