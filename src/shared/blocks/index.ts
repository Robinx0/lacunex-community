// Side-effecting barrel: importing registers every shipped block type.
import './paragraph';
import './heading';
import './lists';
import './codeBlock';
import './quote';
import './divider';
import './callout';
import './finding';
import './screenshot';
import './poc';
import './httpRequest';
import './cve';
import './assetChip';
import './severityBadge';
import './table';
import './toc';
import './pageBreak';

export { rendersFor, registerBlockRenderers, type BlockRenderers } from './registry';
