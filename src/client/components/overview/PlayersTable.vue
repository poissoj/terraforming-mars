<template>
  <div :class="['players-table', {'players-table--escape-velocity': escapeVelocity}]">
    <!-- Player list as a table; the arrangement follows the width of its column (players_table.less) -->
    <PlayersTableHeader :tagColumns="tagColumns" />
    <!-- Tag cells show the column and player sums at the mouse (PlayersTableTagTooltip.vue) -->
    <div class="players-table-rows" :style="{gridTemplateRows: tracks.template}"
      @pointerover="showTagSums" @pointermove="moveTagSums" @pointerleave="hideTagSums">
      <PlayersTableRow v-for="(row, index) in rows" :key="row.player.color"
        :style="{gridRow: String(tracks.lines[index])}"
        :player="row.player"
        :playerView="playerView"
        :firstForGen="row.firstForGen"
        :actionLabel="row.actionLabel"
        :playerIndex="row.playerIndex"
        :tagColumns="tagColumns"
        :tagDetails="tagDetailsByColor[row.player.color]"
        :productionLeaders="productionLeadersByColor[row.player.color] ?? []" />
    </div>
    <PlayersTableTagTooltip v-if="tagSums !== undefined" v-bind="tagSums" />
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {ViewModel} from '@/common/models/PlayerModel';
import {Color} from '@/common/Color';
import {Resource} from '@/common/Resource';
import PlayersTableHeader from '@/client/components/overview/PlayersTableHeader.vue';
import PlayersTableRow from '@/client/components/overview/PlayersTableRow.vue';
import PlayersTableTagTooltip from '@/client/components/overview/PlayersTableTagTooltip.vue';
import {columnTotal, playerTagTotal} from '@/client/components/overview/playersTableTagSums';
import {InterfaceTagsType, TAG_ORDER, TagDetails, buildTagDetails, isTagInGame} from '@/client/components/overview/playerTagDetails';
import {playerGoods} from '@/client/components/overview/playerGoods';
import {PlayersTableRowModel, RowTracks, TagColumnGroups, rowTracks} from '@/client/components/overview/playersTableLayout';

type TagSumsTooltip = {
  tag: InterfaceTagsType;
  color: Color;
  playerName: string;
  columnTotal: number;
  playerTotal: number;
  pointerX: number;
  pointerY: number;
};

export default defineComponent({
  name: 'PlayersTable',
  components: {
    PlayersTableHeader,
    PlayersTableRow,
    PlayersTableTagTooltip,
  },
  props: {
    playerView: {
      type: Object as () => ViewModel,
      required: true,
    },
    // Order as in the classic bar: opponents in turn order, yourself last
    rows: {
      type: Array as () => Array<PlayersTableRowModel>,
      required: true,
    },
  },
  data() {
    return {
      // Tag cell under the mouse and the pointer position for the sums tooltip
      hoveredTag: undefined as {tag: InterfaceTagsType, color: Color} | undefined,
      pointer: {x: 0, y: 0},
    };
  },
  methods: {
    // Mouse only: on touch a tap opens the played cards of the row, a tooltip would get stuck
    showTagSums(event: PointerEvent) {
      if (event.pointerType !== 'mouse') {
        return;
      }
      const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-tag]');
      const row = cell?.closest<HTMLElement>('[data-color]');
      if (cell?.dataset.tag === undefined || row?.dataset.color === undefined) {
        this.hoveredTag = undefined;
        return;
      }
      this.hoveredTag = {tag: cell.dataset.tag as InterfaceTagsType, color: row.dataset.color as Color};
      this.pointer = {x: event.clientX, y: event.clientY};
    },
    moveTagSums(event: PointerEvent) {
      if (this.hoveredTag !== undefined) {
        this.pointer = {x: event.clientX, y: event.clientY};
      }
    },
    hideTagSums() {
      this.hoveredTag = undefined;
    },
  },
  computed: {
    // Escape Velocity: rows get a clock line and a wider name column
    escapeVelocity(): boolean {
      return this.playerView.game.gameOptions.escapeVelocity !== undefined;
    },
    // Computed once per player color; every row has an entry
    tagDetailsByColor(): Record<string, TagDetails> {
      return Object.fromEntries(this.rows.map((row) => [row.player.color, buildTagDetails(row.player, this.playerView)]));
    },
    tagSums(): TagSumsTooltip | undefined {
      const hovered = this.hoveredTag;
      const row = this.rows.find((entry) => entry.player.color === hovered?.color);
      if (hovered === undefined || row === undefined) {
        return undefined;
      }
      return {
        tag: hovered.tag,
        color: hovered.color,
        playerName: row.player.name,
        columnTotal: columnTotal(hovered.tag, Object.values(this.tagDetailsByColor)),
        playerTotal: playerTagTotal(this.tagDetailsByColor[hovered.color]),
        pointerX: this.pointer.x,
        pointerY: this.pointer.y,
      };
    },
    // Only tags at least one player has (or a discount or substitution on) – otherwise hidden for everyone
    tagColumns(): TagColumnGroups {
      const groups: TagColumnGroups = [[]];
      for (const tag of TAG_ORDER) {
        if (tag === 'separator') {
          groups.push([]);
          continue;
        }
        if (tag === 'all' || !isTagInGame(tag, this.playerView.game)) {
          continue;
        }
        const anyoneHasIt = Object.values(this.tagDetailsByColor).some((details) => {
          const detail = details.tagsInOrder.find((entry) => entry.name === tag);
          return detail !== undefined && (detail.count > 0 || detail.discount > 0 || detail.substitution !== undefined);
        });
        if (anyoneHasIt) {
          groups[groups.length - 1].push(tag);
        }
      }
      return groups.filter((group) => group.length > 0);
    },
    tracks(): RowTracks {
      return rowTracks(this.rows.map((row) => row.player.color === this.playerView.thisPlayer?.color));
    },
    // Per resource the player with the sole highest production; nobody on a tie
    productionLeadersByColor(): Partial<Record<Color, Array<Resource>>> {
      const leaders: Partial<Record<Color, Array<Resource>>> = {};
      const goodsByColor = this.rows.map((row) => ({color: row.player.color, goods: playerGoods(row.player)}));
      if (goodsByColor.length < 2) {
        return leaders;
      }
      goodsByColor[0].goods.forEach((good, index) => {
        const productions = goodsByColor.map((entry) => entry.goods[index].production);
        const highest = Math.max(...productions);
        const holders = goodsByColor.filter((entry) => entry.goods[index].production === highest);
        if (highest > 0 && holders.length === 1) {
          (leaders[holders[0].color] ??= []).push(good.type);
        }
      });
      return leaders;
    },
  },
});
</script>
