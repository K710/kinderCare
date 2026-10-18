import { Chip } from '../ui/Chip.jsx';
import { ROLE_LABEL } from '../../utils/constants.js';

const TONE = { admin: 'muted', principal: 'sky', teacher: 'leaf', parent: 'sun' };

export function RoleChip({ role }) {
  return <Chip tone={TONE[role] || 'muted'}>{ROLE_LABEL[role] || role}</Chip>;
}
