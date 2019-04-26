import * as debugGenerator from 'debug';
import * as path from 'path';

import { Asset } from './asset';
import { Flavor } from './flavor';
import { Icon } from './icon';
import { BuildPlugin, GeneratePlugin, Iterant } from './interface';
import { saveContentToFile } from './utils/files';
import { propCombinator } from './utils/prop-combinator';

const debug = debugGenerator('icon-magic:icon-models:plugin-manager');

/**
 * Applies the set of plugins on the given asset and returns all the
 * assets/flavors generated after applying the set of plugins. This function
 * calls applySinglePluginOnAsset and stores the output in a matrix It applies
 * the next plugin on all of the assets generated by the previous plugin
 * @param asset The asset on which to apply the set of plugins
 * @param icon The icon, to be passed into the plugin for reference and/or
 * metadata
 * @param plugins the list of plugins to be applied on this asset
 * @returns a promise with an array of all the assets generated by applying all
 * the plugins
 */
export async function applyPluginsOnAsset(
  asset: Asset | Flavor,
  icon: Icon,
  plugins: BuildPlugin[] | GeneratePlugin[]
): Promise<Asset[] | Flavor[]> {
  // create a two dimensional matrix that stores the result of each plugin
  const pluginResults: Asset[][] | Flavor[][] = [];

  // iterate over all the plugins, applying them one at a time
  for (const [index, plugin] of plugins.entries()) {
    pluginResults[index] = new Array();
    debug(`applyPluginsOnAsset: Applying ${plugin.name} on ${asset.name}`);
    // if it is the first plugin, then set the plugin input as the asset itself
    // push the asset into an array as we iterate over it in the next step
    const pluginInput: Asset[] | Flavor[] =
      pluginResults[index - 1] || new Array(asset);

    // for each input asset, run the plugin and add the results to the matrix
    for (const input of pluginInput) {
      const output = await applySinglePluginOnAsset(input, icon, plugin);

      pluginResults[index] = pluginResults[index].concat(output);
    }
  }
  // return the contents of the last result
  return pluginResults[plugins.length - 1];
}

/**
 * This is the most basic plugin application function It applies one plugin on
 * one asset, simple but... it needs to the plugin on all possible combinations
 * of the iterants Therefore, it checks the icon config for the following
 * 1) Iterants - are config properties over which this function iterates over
 *    and applies the plugin
 * 2) If it does not have any iterants, then the plugin function is applied on
 *    the asset itself
 * @param asset The asset on which the plugin needs to be applied
 * @param icon The icon containing the iterants
 * @param plugin The function that is applied on the asset
 * @returns A promise of containing all the
 */
async function applySinglePluginOnAsset(
  asset: Asset | Flavor,
  icon: Icon,
  plugin: BuildPlugin | GeneratePlugin
): Promise<Asset[] | Flavor[]> {
  let output: Flavor[] = new Array();
  if (plugin.iterants) {
    for (const propCombo of getAllPropCombinations(icon, plugin.iterants) ||
      []) {
      debug(
        `applySinglePluginOnFlavor: Applying ${plugin.name} on ${
          asset.name
        } with`
      );
      output = output.concat(
        await plugin.fn.call(
          icon,
          asset,
          icon,
          Object.assign(plugin.params || {}, { propCombo: propCombo })
        )
      );
    }
  } else {
    // when the plugin does not have any or iterants
    output = output.concat(
      await plugin.fn.call(icon, asset, icon, plugin.params)
    );
  }

  const promises = [];
  if (plugin.writeToOutput) {
    for (const outputFlavor of output) {
      if (outputFlavor.contents) {
        promises.push(
          saveContentToFile(
            path.join(icon.iconPath, 'tmp'),
            outputFlavor.name,
            outputFlavor.contents,
            'svg'
          )
        );
      }
    }
  }
  await Promise.all(promises);
  return output;
}

/**
 * A util to go through the icon, locate the iterants
 * @param icon the object containing the iterants
 * @param iterants the set of properties on the icon on whose values the plugin
 * needs to iterate
 * @returns an array of objects, where the keys are the iterant names and values
 * are iterant values
 */
export function getAllPropCombinations(icon: Icon, iterants: Iterant) {
  const props = {};
  for (const iterant of iterants) {
    if (!icon.hasOwnProperty(iterant)) {
      throw new Error(
        `Could not find ${iterant} in the config file of ${icon.iconName}`
      );
    }
    let iterantValues = icon[iterant];
    if (!(iterantValues instanceof Array)) {
      iterantValues = new Array(iterantValues);
    }
    props[iterant] = iterantValues;
  }
  return propCombinator(props);
}
