import { html, render } from "uhtml";
import { Base, componentMap } from "./base";
import { styleString } from "./style";

/** Allow await'ing for a short time
 * @param {number} ms */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wait for a condition to be satisfied
 * @param {() => boolean} test
 * @param {number} delay */
async function waitFor(test, delay = 1) {
  while (!test()) await sleep(delay);
}

/**
 * Calculate the actual image size undoing the effects of object-fit
 * This is async so it can wait for the image to be loaded initially.
 *
 * @param {HTMLImageElement} img
 * */
async function getActualImageSize(img) {
  let left = 0,
    top = 0,
    width = 1,
    height = 1;
  if (img) {
    // wait for the image to load
    await waitFor(() => img.complete && img.naturalWidth != 0);
    const cw = img.width,
      ch = img.height,
      iw = img.naturalWidth,
      ih = img.naturalHeight,
      iratio = iw / ih,
      cratio = cw / ch;
    if (iratio > cratio) {
      width = cw;
      height = cw / iratio;
    } else {
      width = ch * iratio;
      height = ch;
    }
    left = (cw - width) / 2;
    top = (ch - height) / 2;
  }
  return { left, top, width, height };
}

function px(v) {
  return `${v}px`;
}
function pct(v) {
  return `${v}%`;
}

/** @typedef {Row & {x: number, y: number, w: number, h: number, src: string, invisible: boolean }} VRow */

class VSD extends Base {
  /** @type {Props} */
  static defaultProps = {
    tags: [],
    match: "contains",
    name: "vsd",
    scale: "1",
  };

  template() {
    const { data, state, rules } = this.context;
    const tags = state.normalizeTags(this.props.tags);
    const items = /** @type {VRow[]} */ (
      data.getTaggedRows(tags, this.props.match)
    );
    const src = items.find((item) => item.src)?.src;
    return html`<div class="vsd flex show" id=${this.id}>
      <img src=${src} />
      <div
        class="markers"
        ref=${(/** @type {HTMLDivElement & { observer: any }} */ node) => {
          const img = /** @type {HTMLImageElement} */ (
            node.previousElementSibling
          );
          if (!node.observer) {
            /* get a callback when the image changes size so that we
             * can resize the div containing the markers to match */
            node.observer = new ResizeObserver(async () => {
              const rect = await getActualImageSize(img);
              node.style.position = "absolute";
              node.style.left = px(rect.left);
              node.style.top = px(rect.top);
              node.style.width = px(rect.width);
              node.style.height = px(rect.height);
            });
            node.observer.observe(img);
          }
        }}
      >
        ${items
          .filter((item) => item.x)
          .map(
            (item) => html`<button
              style=${styleString({
                left: pct(item.x),
                top: pct(item.y),
                width: pct(item.w),
                height: pct(item.h),
                position: "absolute",
              })}
              ?invisible=${item.invisible}
              onClick=${rules.handler(this.name, item, "press")}
            >
              <span>${item.label}</span>
            </button>`
          )}
      </div>
    </div>`;
  }
}

componentMap.addMap("vsd", VSD);
