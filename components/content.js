import { html, render } from "uhtml";
import { Base } from "./base";
import db from "../db";
import { Data } from "../data";
import XLSX from "xlsx";
import css from "ustyler";

/** @param {Blob} blob */
async function readSheetFromBlob(blob) {
  const data = await blob.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const header = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    header.push(sheet[XLSX.utils.encode_cell({ r: 0, c })]?.v);
  }
  /** @type {Rows} */
  const dataArray = [];
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    /** @type {Row} */
    const row = { tags: [] };
    const tags = row.tags;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const name = header[c];
      if (!name) continue;
      const value = sheet[XLSX.utils.encode_cell({ r, c })]?.v;
      if (!value) continue;
      if (name.startsWith("tags")) {
        tags.push(value);
      } else {
        row[name] = value;
      }
    }
    if (row.tags.length > 0 || Object.keys(row).length > 1) dataArray.push(row);
  }
  return dataArray;
}

export class Content extends Base {
  template() {
    const data = this.context.data;
    /**
     * A reference to the error messages div
     * @type {{current: HTMLInputElement}} */
    const refMessages = { current: null };
    /**
     * A reference to the load button so I can enabled when the url is valid
     * @type {{current: HTMLInputElement}} */
    return html`<div class="content">
      <h1>Content</h1>
      <p>
        ${data.allrows.length} rows with these fields:
        ${String(data.allFields).replaceAll(",", ", ")}
      </p>
      <h2>Load content from spreadsheets</h2>
      <form
        onsubmit=${(/** @type {SubmitEvent} */ e) => {
          e.preventDefault();
          console.log("submit", e);
          // clear messages
          refMessages.current.innerHTML = "";
          const form = e.target;
          /** @type {string} */
          let URL = form[0].value;
          if (URL.length === 0) return;
          // check for a Google Sheets URL
          if (
            URL.match(/https:\/\/docs.google.com\/spreadsheets\/.*\/edit.*/)
          ) {
            // hack Google Sheets URL to use the gviz interface
            URL = URL.replace(/\/edit.*$/, "/gviz/tq?tqx=out:csv&tq=SELECT *");
          }
          // do this part asynchronously
          (async () => {
            try {
              const response = await fetch(URL);
              if (!response.ok)
                throw new Error(`Fetching the URL failed: ${response.status}`);
              const blob = await response.blob();
              var result = await readSheetFromBlob(blob);
            } catch (e) {
              refMessages.current.innerHTML = e.message;
              return;
            }
            await db.write("content", result);
            this.context.data = new Data(result);
            this.context.state.update();
          })();
        }}
      >
        <label for="remoteFileInput">URL: </label>
        <input
          id="remoteFileInput"
          name="url"
          type="url"
          placeholder="Enter a URL"
        />
        <input type="submit" value="Load" />
      </form>
      <br />
      <label for="localFileInput">Local: </label>
      <input
        id="localFileInput"
        type="file"
        onchange=${async (/** @type {InputEvent} e */ e) => {
          // clear messages
          refMessages.current.innerHTML = "";
          const target = /** @type {HTMLInputElement} */ (e.target);
          try {
            var result = await readSheetFromBlob(target.files[0]);
          } catch (e) {
            refMessages.current.innerHTML = e.message;
            return;
          }
          await db.write("content", result);
          this.context.data = new Data(result);
          this.context.state.update();
        }}
      />
      <div id="messages" ref=${refMessages}></div>
      <h2>Load images</h2>
      <label for="images">Upload images: </label>
      <input
        id="images"
        type="file"
        multiple
        accept=".png,.jpg"
        onchange=${async (/** @type {InputEventWithTarget} */ event) => {
          const input = /** @type {HTMLInputElement} */ (event.currentTarget);
          if (!input || !input.files || !input.files.length) {
            return;
          }
          for (const file of input.files) {
            await db.addImage(file, file.name);
            // ask any live images with this name to refresh
            for (const img of document.querySelectorAll(
              `img[dbsrc="${file.name}"]`
            )) {
              /** @type {ImgDb} */ (img).refresh();
            }
          }
          this.context.state.update();
        }}
      />
      <h2>Currently loaded images</h2>
      <ol style="column-count: 3">
        ${(/** @type {HTMLElement} */ comment) => {
          /* I'm experimenting here. db.listImages() is asynchronous but I don't want
           * to convert this entire application to the async version of uhtml. Can I
           * inject content asynchronously using the callback mechanism he provides?
           * As I understand it, when an interpolation is a function he places a
           * comment node in the output and passes it to the function.
           * I am using the comment node to find the parent container, then rendering
           * the asynchronous content when it becomes available being careful to keep
           * the comment node in the output. It seems to work, is it safe?
           */
          db.listImages().then((names) => {
            const list = names.map((name) => html`<li>${name}</li>`);
            render(comment.parentNode, html`${comment}${list}`);
          });
        }}
      </ol>
    </div>`;
  }
}

css`
  .content form {
    display: flex;
    width: 100%;
    gap: 0.5em;
  }

  .content form input[type="url"] {
    flex: 1;
    max-width: 60%;
  }

  .content div#messages {
    color: red;
    font-size: 2em;
    padding-left: 1em;
    padding-top: 1em;
  }
`;
