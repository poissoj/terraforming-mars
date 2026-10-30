<template>
  <div class="stats-table-scroll">
    <table class="stats-table">
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            :class="{'stats-table-sorted': column.key === sortKey, 'stats-table-ascending': column.key === sortKey && ascending, 'stats-table-text': column.text, 'stats-table-unsortable': column.sortable === false}"
            :aria-sort="column.key === sortKey ? (ascending ? 'ascending' : 'descending') : undefined"
            @click="sortBy(column)"
            v-i18n>{{ column.label }}</th>
        </tr>
      </thead>
      <tbody>
        <!-- With rowHref the whole row opens its link; links and buttons inside keep their own target -->
        <tr v-for="row in sortedRows" :key="keyOf(row)" :class="{'stats-table-row--link': linkOf(row) !== undefined}"
          :tabindex="linkOf(row) !== undefined ? 0 : undefined" @click="openRow(row, $event)" @keydown.enter="openRow(row, $event)">
          <td v-for="column in columns" :key="column.key" :class="{'stats-table-text': column.text}">
            <slot :name="column.key" :row="row" :rows="sortedRows">{{ cell(row, column) }}</slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue';
import {StatsColumn} from './statsTypes';

// Text columns start ascending, numbers descending – unless the column says otherwise
function firstAscending(column: StatsColumn): boolean {
  return column.firstAscending ?? column.text === true;
}

// Sortable table for all statistics lists
export default defineComponent({
  name: 'StatsTable',
  props: {
    columns: {type: Array as PropType<ReadonlyArray<StatsColumn>>, required: true},
    rows: {type: Array as PropType<ReadonlyArray<unknown>>, required: true},
    rowKey: {type: Function as PropType<(row: never) => string>, required: true},
    initialSort: {type: String, required: true},
    // Target of a row click (opens in a new tab like the result links); without it rows are not clickable
    rowHref: {type: Function as PropType<(row: never) => string | undefined>, required: false},
  },
  data() {
    const column = this.columns.find((candidate) => candidate.key === this.initialSort);
    return {
      sortKey: this.initialSort,
      ascending: column !== undefined && firstAscending(column),
    };
  },
  computed: {
    sortedRows(): Array<unknown> {
      const column = this.columns.find((candidate) => candidate.key === this.sortKey);
      if (column === undefined) {
        return [...this.rows];
      }
      const direction = this.ascending ? 1 : -1;
      return [...this.rows].sort((first, second) => {
        const left = column.value(first as never);
        const right = column.value(second as never);
        // Unknown values always at the end, regardless of sort direction
        if (left === undefined || right === undefined) {
          return left === right ? 0 : left === undefined ? 1 : -1;
        }
        const result = typeof left === 'string' ? left.localeCompare(String(right)) : left - Number(right);
        return result * direction;
      });
    },
  },
  methods: {
    keyOf(row: unknown): string {
      return this.rowKey(row as never);
    },
    cell(row: unknown, column: StatsColumn): string | number | undefined {
      return column.format ? column.format(row as never) : column.value(row as never);
    },
    linkOf(row: unknown): string | undefined {
      return this.rowHref?.(row as never);
    },
    openRow(row: unknown, event: Event): void {
      const href = this.linkOf(row);
      const target = event.target as HTMLElement | null;
      // Own links (board chip, result button) already did their job
      if (href === undefined || target?.closest('a, button') !== null) {
        return;
      }
      window.open(href, '_blank', 'noopener');
    },
    sortBy(column: StatsColumn): void {
      if (column.sortable === false) {
        return;
      } else if (column.key === this.sortKey) {
        this.ascending = !this.ascending;
      } else {
        this.sortKey = column.key;
        this.ascending = firstAscending(column);
      }
    },
  },
});
</script>
