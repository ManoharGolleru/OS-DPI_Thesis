/**
 * @typedef {Object[]} Rows
 * @property {string[]} tags
 * @property {string} [message]
 * @property {string} [label]
 * @property {string} [link]
 * @property {string} [icon]
 * @property {number} [row]
 * @property {number} [column]
 * @property {Object} [details]
 * */

class Data {
  /** @param {Rows} rows */
  constructor(rows) {
    this.allrows = rows;
  }

  /**
   * Extract rows with the given tags
   *
   * @param {string[]} tags - Tags that must be in each row
   * @param {string} match - how to match
   * @return {Rows} Rows with the given tags
   */
  getTaggedRows(tags, match) {
    let result = [];
    if (match == "contains") {
      result = this.allrows.filter((row) => {
        return tags.every((tag) => row.tags.indexOf(tag) >= 0);
      });
    } else if (match == "sequence") {
      result = this.allrows.filter((row) => {
        return (
          tags.length == row.tags.length &&
          tags.every((tag, i) => row.tags[i] == tag)
        );
      });
    }
    // console.log("gtr result", result);
    return result;
  }

  /**
   * Test if tagged rows exist
   *
   * @param {string[]} tags - Tags that must be in each row
   * @return {Boolean} true if tag combination occurs
   */
  hasTaggedRows(tags) {
    return this.allrows.some((row) =>
      tags.every((tag) => row.tags.indexOf(tag) >= 0)
    );
  }
}

export default Data;
