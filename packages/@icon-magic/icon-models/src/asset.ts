import * as debugGenerator from 'debug';
import * as path from 'path';

import { AssetConfig, Content } from './interface';
import { getFileContents } from './utils/files';

/**
 * This class abstracts the smallest set of information pertains to an asset
 * file in memory
 */
export class Asset {
  name: string;
  contents: Content | undefined;
  iconPath: string;
  private path: string;
  private debug: debugGenerator.IDebugger;
  private assetConfig: AssetConfig;

  /**
   * Creates a new asset
   * @param iconPath Absolute path of the icon folder which this asset belongs
   *                 to All paths in the asset are relative to this iconPath
   * @param config a config object to set the initial properties of the asset
   */
  constructor(iconPath: string, config: AssetConfig) {
    this.debug = debugGenerator('icon-magic:icon-models:asset');
    // if iconPath is not absolute, throw an error
    if (!path.isAbsolute(iconPath)) {
      throw new Error(
        'AssetCreationError: iconPath must always be absolute: ${iconPath)'
      );
    }
    this.iconPath = iconPath;

    // if the asset does not have a name, then set the name to be the name of
    // the file itself
    this.name = config.name ? config.name : path.parse(config.path).name;

    // set the path (this automatically calls the setter defined on path)
    this.path = config.path;

    // set the contents only if it is passed in the config
    if (config.contents) {
      this.contents = config.contents;
    }
    this.assetConfig =  {
      name: this.name,
      path: `./${path.relative(this.iconPath, this.path)}`
    };
    this.debug(`Asset ${this.name} created in ${this.iconPath}`);
  }

  /**
   * The path of an asset is always relative to the iconpath
   */
  getPath() {
    return path.resolve(this.iconPath, this.path);
  }

  /**
   * Returns the Asset data that needs to be stored in the config file
   */
  getConfig(): AssetConfig {
    return this.assetConfig;
  }

  /**
   * Returns the content stored in the path of this asset
   */
  async getContents(): Promise<Content> {
    // if it isn't already retrieved, read the file from disk
    if (!this.contents) {
      this.debug(`Reading ${this.path}'s file contents from the disk`);
      this.contents = await getFileContents(this.path);
    }
    return this.contents;
  }
}
