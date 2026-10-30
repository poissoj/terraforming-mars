// Shared shapes of the stats building blocks. In a .ts file because .ts files can't import types from .vue files
// (the bundler only knows the default export there).

/** A table column: value returns the sort value, format the display (without slot). Cells with links/bars come via slot. */
// The table handles lists of unrelated row types. A bivariant callback lets each column keep its own
// row type (EntityRow, StatsGame …) while the table can call it with an opaque row.
export type BivariantCallback<Arg, Result> = {
  bivarianceHack(arg: Arg): Result;
}['bivarianceHack'];

export type StatsColumn = {
  key: string;
  /** English, gets translated. */
  label: string;
  value: BivariantCallback<unknown, number | string | undefined>;
  format?: BivariantCallback<unknown, string>;
  /** Text left-aligned and sorted ascending; numbers right-aligned and descending. */
  text?: boolean;
  /** Direction of the first click when it differs from the default above (e.g. a left-aligned date, newest first). */
  firstAscending?: boolean;
  /** False for columns without a meaningful order (e.g. a link). */
  sortable?: boolean;
};

export type StatsKpi = {
  /** English, gets translated. */
  label: string;
  value: string | number;
};

export type StatsBar = {
  label: string;
  value: number;
  /** Part of the bar that is stacked highlighted at the bottom (e.g. of which wins). */
  highlight?: number;
  /** Tooltip; without one, “label: value” is shown. */
  title?: string;
};

/** A point of a line; highlighted points (e.g. wins) are drawn larger and yellow. */
export type StatsChartPoint = {
  value: number | undefined;
  highlight?: boolean;
  title?: string;
};

export type StatsChartSeries = {
  /** Display name; gets translated (player names stay unchanged). */
  name: string;
  /** Color like the player colors (red, green, blue …). */
  color: string;
  points: Array<StatsChartPoint>;
};
