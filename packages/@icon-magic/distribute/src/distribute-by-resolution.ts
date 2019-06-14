import { IconSet } from '@icon-magic/icon-models';
import { Logger, logger } from '@icon-magic/logger';
import * as fs from 'fs-extra';
import * as path from 'path';

import { getAssetResolutionFromName, getIconFlavorsByType } from './utils';
const LOGGER: Logger = logger('icon-magic:distribute:distribute-by-resolution');

/**
 * Distributes icons into different folders based on the resolution
 * This is needed for Android
 * @param iconSet set of icons to be moved to the output folder
 * @param outputPath output directory where the different folders are created
 * for each resolution
 */
export async function distributeByResolution(
  iconSet: IconSet,
  outputPath: string
) {
  for (const icon of iconSet.hash.values()) {
    LOGGER.debug(`distributeByResolution for ${icon.iconName}`);
    const assets = getIconFlavorsByType(icon, 'webp');
    let outputIconDir;
    // copy all assets to the output icon directory
    const promises = [];
    for (const asset of assets) {
      // the output folder is the folder by resolution
      outputIconDir = path.join(outputPath, getAssetResolutionFromName(asset));

      let assetName = `${icon.iconName}_${path.basename(asset.getPath())}`;
      // if the category is present, prepend it to the name
      if (icon.category) {
        assetName = `${icon.category}_${assetName}`;
      }

      await fs.mkdirp(outputIconDir);

      // append the icon name to the asset since all icons go into a single
      // directory
      // TODO: have icons have a category field in their config and prepend the
      // category to the asset name. Eg: nav_iconName_assetName
      promises.push(
        fs.copy(asset.getPath(), path.join(outputIconDir, assetName))
      );
    }
    await Promise.all(promises);
  }
}