export const ASSET_VARIANTS = Object.freeze({
  sm: Object.freeze({size: 36, frameCount: 12}),
  md: Object.freeze({size: 46, frameCount: 14}),
  lg: Object.freeze({size: 58, frameCount: 16})
});

const satelliteState = cell => cell?.satellitePrismatic ? 'prismatic-satellite' : cell?.satellite ? 'satellite' : 'plain';

export function gemAssetKey(cell) {
  if (!cell) return 'empty';
  const kind = cell.kind === 'shell' ? 'shell' : cell.kind === 'prismatic' ? 'prismatic' : 'gem';
  return `${kind}-c${cell.color}-s${cell.shape}-${satelliteState(cell)}`;
}

export function gemAssetPath(cell, variant='lg') {
  if (!ASSET_VARIANTS[variant]) throw new Error(`Unknown gem asset variant: ${variant}`);
  return `assets/gems/${variant}/${gemAssetKey(cell)}.svg`;
}
